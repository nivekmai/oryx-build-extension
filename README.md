# Oryx with custom QMK Build extension

An extension to easily start runs and access artifacts for your fork of [poulainpi's oryx-with-custom-qmk](https://github.com/poulainpi/oryx-with-custom-qmk).

This extension adds a bar to the top of ZSA's Oryx which lets you start the "Fetch and build layout" workflow after you've updated your keymap. You can then download the firmware when the run completes. Hopefully without ever having to visit github just to kick off/download builds.

![configure zsa io_moonlander_layouts_Eon7Y_latest_0](https://github.com/user-attachments/assets/b0091eea-4a53-4d58-b63b-be86825936be)

## Usage

Extension is configured via the extensions options page, go to extensions > <b>Oryx Extension</b> > ⋮ > <b>Options</b>.

To get the Github Action URL</b> go to your repository page &gt; <b>Actions</b> &gt; <b>Fetch and build layout</b> and copy the URL.

To get the <b>Personal Access Token</b> you will need to follow the <a href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token">Github Documentation</a>. Make sure the token has access to read and write the <b>Actions</b> scope.

No need to save the page, after these values are entered here, you will see a button on Oryx to <b>Run Github Workflow</b>, which will trigger the workflow to run. These values are stored only in the browser, they are not sync'd to any cloud storage.

> [!NOTE]
> FOR ERGODOX-EZ AND PLANK USERS
> 
> Since it's not exactly straightforward to map the Oryx page to the `layout_geometry` for these boards (with the various versions available), there is an additional option to be able to override the `layout_geometry` that is used int the Github Worflow.

## How it works

The extension uses the Github API and the Oryx URL to drive the Github workflow. When the latest workflow is complete, the API is used to create a download link.

The bulk of the code is in [App.tsx](pages/content-ui/src/App.tsx), and is almost entirely just attempting to handle various states/latency from the API.

## Development

Forked from [Jonghakseo/chrome-extension-boilerplate-react-vite](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite).  See the boilerplate readme for instructions.
tl;dr:
```
# install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# set to .nvmrc version
nvm use `cat .nvmrc`
# install pnpm
npm install -g pnpm
# install deps
pnpm install
# build in dev mode
pnpm dev
```
Then use chrome dev mode to "Load unpacked" and load the `dist` folder. Boilerplate has HMR so saving should trigger reloads (you'll see Oryx reload if HMR is working).
