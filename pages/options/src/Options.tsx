import '@src/Options.css';
import { useStorage, withErrorBoundary, withSuspense, parseGithubUrl, buildGithubUrl } from '@extension/shared';
import { configStorage } from '@extension/storage';
import { Input } from '@extension/ui';
import type { ChangeEvent } from 'react';
import { useState } from 'react';

const Options = () => {
  const {
    owner: store_owner,
    repo: store_repo,
    workflow_id: store_workflow_id,
    token: store_token,
  } = useStorage(configStorage);
  const [repo_url, setRepoUrl] = useState(
    buildGithubUrl({ owner: store_owner, repo: store_repo, workflow_id: store_workflow_id }),
  );
  const [token, setToken] = useState(store_token);
  const onRepoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const github_url = e.target.value;
    setRepoUrl(github_url);
    const { owner, repo, workflow_id } = parseGithubUrl(github_url);
    configStorage.set({ owner, repo, workflow_id, token: store_token });
  };
  const onTokenChange = (e: ChangeEvent<HTMLInputElement>) => {
    const token = e.target.value;
    setToken(token);
    configStorage.set({ token, owner: store_owner, repo: store_repo, workflow_id: store_workflow_id });
  };

  return (
    <div className="container mb-6 grid grid-cols-1 content-start gap-6">
      <div className="pt-8 text-left text-lg font-medium text-white">Instructions</div>
      <div className="pt-1 text-left text-sm text-white">
        To get the <b>Github Action URL</b> go to your repository page &gt; <b>Actions</b> &gt;{' '}
        <b>Fetch and build layout</b> and copy the URL.
      </div>
      <div className="py-1 text-left text-sm text-white">
        To get the <b>Personal Access Token</b> you will need to follow the{' '}
        <a href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token">
          Github Documentation
        </a>
        . Make sure the token has access to read and write the <b>Actions</b> scope.
      </div>
      <div className="py-1 text-left text-sm text-white">
        No need to save the page, after these values are entered here, you will see a button on Oryx to{' '}
        <b>Run Github Workflow</b>, which will trigger the workflow to run. These values are stored only in the browser,
        they are not sync&apos;d to any cloud storage.
      </div>
      <hr />
      <Input
        label="Github Action URL"
        placeholder="https://github.com/you/oryx-with-custom-qmk/actions/workflows/fetch-and-build-layout.yml"
        value={repo_url || ''}
        onChange={onRepoChange}
      />
      <Input
        label="Personal Access Token"
        placeholder="github_pat_dQw4w9WgXcQ"
        value={token || ''}
        onChange={onTokenChange}
      />
    </div>
  );
};

export default withErrorBoundary(withSuspense(Options, <div> Loading ... </div>), <div> Error Occurred </div>);
