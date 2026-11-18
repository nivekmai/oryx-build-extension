export type FirmwareArtifact = {
  id: number;
  name: string;
  expired: boolean;
};

type FirmwareResponse = { ok: true; firmwareBase64: string } | { ok: false; error: string };

export async function downloadFirmwareFromArtifact(
  owner: string,
  repo: string,
  artifactId: number,
  token: string,
  expectedGeometry: string,
): Promise<{ firmware: ArrayBuffer }> {
  const response = (await chrome.runtime.sendMessage({
    type: 'download-firmware-artifact',
    owner,
    repo,
    artifactId,
    token,
    expectedGeometry,
  })) as FirmwareResponse | undefined;

  if (!response) {
    throw new Error('The extension background worker did not respond to the firmware download request.');
  }
  if (!response.ok) {
    throw new Error(response.error);
  }

  const binary = atob(response.firmwareBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return { firmware: bytes.buffer };
}
