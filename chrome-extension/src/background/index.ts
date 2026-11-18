import 'webextension-polyfill';
import { unzipSync } from 'fflate';

console.log('background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");

type ArtifactDownloadRequest = {
  type: 'download-firmware-artifact';
  owner: string;
  repo: string;
  artifactId: number;
  token: string;
  expectedGeometry: string;
};

type ArtifactDownloadResponse = { ok: true; firmwareBase64: string } | { ok: false; error: string };

function isArtifactDownloadRequest(message: unknown): message is ArtifactDownloadRequest {
  if (typeof message !== 'object' || message === null) return false;
  const request = message as Partial<ArtifactDownloadRequest>;
  return (
    request.type === 'download-firmware-artifact' &&
    typeof request.owner === 'string' &&
    typeof request.repo === 'string' &&
    typeof request.artifactId === 'number' &&
    typeof request.token === 'string' &&
    typeof request.expectedGeometry === 'string'
  );
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function downloadFirmwareArtifact(request: ArtifactDownloadRequest): Promise<ArtifactDownloadResponse> {
  const { owner, repo, artifactId, token, expectedGeometry } = request;
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo) || !Number.isSafeInteger(artifactId) || artifactId < 1) {
    return { ok: false, error: 'The GitHub artifact details are invalid.' };
  }

  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/artifacts/${artifactId}/zip`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) {
    return { ok: false, error: `GitHub artifact download failed (${response.status} ${response.statusText}).` };
  }

  const archive = new Uint8Array(await response.arrayBuffer());
  if (archive.byteLength === 0 || archive.byteLength > 16 * 1024 * 1024) {
    return { ok: false, error: 'The downloaded artifact archive has an unexpected size.' };
  }

  const bins = Object.entries(unzipSync(archive)).filter(([name, contents]) => {
    const filename = name.split('/').pop()?.toLowerCase() ?? '';
    return filename.endsWith('.bin') && contents.byteLength > 0;
  });
  const expectedName = expectedGeometry.replaceAll('/', '_').toLowerCase();
  if (bins.length !== 1 || !bins[0][0].toLowerCase().includes(expectedName)) {
    return { ok: false, error: `The artifact did not contain one ${expectedGeometry} firmware binary.` };
  }

  const [, firmware] = bins[0];
  if (firmware.byteLength > 512 * 1024) {
    return { ok: false, error: 'The firmware image exceeds the 512 KB limit.' };
  }

  return {
    ok: true,
    firmwareBase64: toBase64(firmware),
  };
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isArtifactDownloadRequest(message)) return false;

  void downloadFirmwareArtifact(message)
    .then(sendResponse)
    .catch(error => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  return true;
});
