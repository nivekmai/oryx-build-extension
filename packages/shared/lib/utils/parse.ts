export const parseOryxUrl = () => {
  const [, layout_geometry, layout_id] =
    window.location.href.match('https://configure.zsa.io/([^/]+)/layouts/([^/]+)') || [];
  return { layout_geometry, layout_id };
};

export const parseGithubUrl = (url: string) => {
  const [, owner, repo, workflow_id] = url.match('https://github.com/([^/]+)/([^/]+)/actions/workflows/([^/]+)') || [];
  return { owner, repo, workflow_id };
};

export const buildGithubUrl = ({ owner, repo, workflow_id }: { owner: string; repo: string; workflow_id: string }) => {
  if (owner == undefined) {
    return '';
  }
  return `https://github.com/${owner}/${repo}/actions/workflows/${workflow_id}`;
};
