(() => {
  if (window.__oryxCustomFirmwareBridgeInstalled) return;
  window.__oryxCustomFirmwareBridgeInstalled = true;

  let pendingFirmware = null;
  let expiryTimer = 0;
  const originalFetch = window.fetch.bind(window);

  const attachOryxSuffix = (firmware, referenceFirmware) => {
    const reference = new Uint8Array(referenceFirmware);
    const suffix = reference.subarray(reference.length - 16);
    if (reference.length < 16 || suffix[8] !== 0x55 || suffix[9] !== 0x46 || suffix[10] !== 0x44 || suffix[11] !== 16) {
      throw new Error('Oryx firmware did not include a supported DFU suffix for this keyboard.');
    }

    const image = new Uint8Array(firmware.byteLength + 16);
    image.set(new Uint8Array(firmware));
    image.set(suffix.subarray(0, 12), firmware.byteLength);

    let crc = 0xffffffff;
    for (let index = 0; index < image.length - 4; index++) {
      crc ^= image[index];
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    new DataView(image.buffer).setUint32(image.length - 4, (crc ^ 0xffffffff) >>> 0, true);
    return image.buffer;
  };

  window.fetch = (input, init) => {
    const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    if (pendingFirmware && /^https:\/\/oryx\.zsa\.io\/firmware\//.test(url)) {
      const firmware = pendingFirmware;
      pendingFirmware = null;
      window.clearTimeout(expiryTimer);
      return originalFetch(input, init).then(async response => {
        try {
          if (!response.ok) throw new Error(`Oryx firmware request failed (${response.status}).`);
          const image = attachOryxSuffix(firmware, await response.clone().arrayBuffer());
          document.dispatchEvent(new CustomEvent('oryx-custom-firmware-used'));
          return new Response(image, {
            status: response.status,
            statusText: response.statusText,
            headers: { 'Content-Type': 'application/octet-stream' },
          });
        } catch (error) {
          document.dispatchEvent(
            new CustomEvent('oryx-custom-firmware-error', {
              detail: error instanceof Error ? error.message : String(error),
            }),
          );
          throw error;
        }
      });
    }
    return originalFetch(input, init);
  };

  document.addEventListener('oryx-custom-firmware-arm', event => {
    if (typeof event.detail !== 'string' || event.detail.length > 700_000) return;
    const binary = atob(event.detail);
    if (binary.length > 512 * 1024) return;
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);

    pendingFirmware = bytes.buffer;
    window.clearTimeout(expiryTimer);
    expiryTimer = window.setTimeout(() => {
      pendingFirmware = null;
    }, 30_000);
  });

  document.documentElement.dataset.oryxCustomFirmwareBridge = 'ready';
})();
