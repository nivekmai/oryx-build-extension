describe('Content UI Injection', () => {
  it('should locate the injected content UI div', async () => {
    await browser.url('https://configure.zsa.io/moonlander/layouts/default');

    const contentDiv = await $('#chrome-extension-boilerplate-react-vite-content-view-root').getElement();
    await expect(contentDiv).toBeDisplayed();
  });

  it('should be able to open the options page when unconfigured', async () => {
    await browser.url('https://configure.zsa.io/moonlander/layouts/default');

    const contentDiv = await $('#chrome-extension-boilerplate-react-vite-content-view-root').getElement();
    const optionsLink = await contentDiv.shadow$('#options_link').getElement();
    await optionsLink.click();
    const extensionPath = await browser.getExtensionPath();
    const optionsUrl = `${extensionPath}/options/index.html`;
    await browser.switchWindow(optionsUrl);
  });
});
