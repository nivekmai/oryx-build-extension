import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync('../package.json', 'utf8'));

/**
 * After changing, please reload the extension at `chrome://extensions`
 * @type {chrome.runtime.ManifestV3}
 */
const manifest = {
  manifest_version: 3,
  default_locale: 'en',
  /**
   * if you want to support multiple languages, you can use the following reference
   * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization
   */
  name: '__MSG_extensionName__',
  browser_specific_settings: {
    gecko: {
      id: 'nivekmai-oryx-build-extension@github.com',
      strict_min_version: '109.0',
    },
  },
  version: packageJson.version,
  description: '__MSG_extensionDescription__',
  permissions: ['storage'],
  host_permissions: ['https://configure.zsa.io/*/layouts/*'],
  options_page: 'options/index.html',
  background: {
    service_worker: 'background.iife.js',
    type: 'module',
  },
  icons: {
    48: 'icon-48.png',
    96: 'icon-96.png',
    128: 'icon-128.png',
  },
  content_scripts: [
    {
      matches: ['https://configure.zsa.io/*/layouts/*'],
      js: ['content-ui/index.iife.js'],
    },
  ],
  web_accessible_resources: [
    {
      resources: ['*.js', '*.css', '*.svg', 'icon-128.png', 'icon-34.png', 'options/index.html'],
      matches: ['*://*/*'],
    },
  ],
};

export default manifest;
