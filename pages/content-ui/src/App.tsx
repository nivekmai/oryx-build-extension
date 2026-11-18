import { useEffect, useState } from 'react';
import { Button, useInterval, useVisibilityChange } from '@extension/ui';
import { useStorage, QmkLayout } from '@extension/shared';
import { configStorage } from '@extension/storage';
import { request } from '@octokit/request';
import { downloadFirmwareFromArtifact, type FirmwareArtifact } from './github-artifact';

enum Progress {
  IDLE,
  RUNNING,
  WAITING,
  FETCHING,
  FETCHED,
  FAILED,
}

enum ArtifactProgress {
  IDLE,
  FETCHING,
  FETCHED,
  FAILED,
}

type WorkflowRun = {
  id: number;
  status: string;
  run_started_at: string | null;
  created_at: string;
  html_url: string;
};

function workflowDate(run: WorkflowRun): string {
  return new Date(run.run_started_at ?? run.created_at).toLocaleString();
}

// from: https://docs.github.com/en/rest/actions/workflow-runs?apiVersion=2022-11-28#list-workflow-runs-for-a-repository--parameters
enum WorkflowStatus {
  COMPLETED = 'completed',
  ACTION_REQUIRED = 'action_required',
  CANCELLED = 'cancelled',
  FAILURE = 'failure',
  NEUTRAL = 'neutral',
  SKIPPED = 'skipped',
  STALE = 'stale',
  SUCCESS = 'success',
  TIMED_OUT = 'timed_out',
  IN_PROGRESS = 'in_progress',
  QUEUED = 'queued',
  REQUESTED = 'requested',
  WAITING = 'waiting',
  PENDING = 'pending',
}

const WAIT_INTERVAL = 10_000;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

let latestWorkflowRun: Date | null = null;

export default function App() {
  const { owner, repo, workflow_id, token, layout_geometry: store_layout_geometry } = useStorage(configStorage);
  const [qmk_layout, setQmkLayout] = useState(QmkLayout.bootstrap());
  const [layout_geometry, setLayoutGeometry] = useState(store_layout_geometry);
  const [progress, setProgress] = useState(Progress.IDLE);
  const [artifactProgress, setArtifactProgress] = useState(ArtifactProgress.IDLE);
  const [latestWorkflow, setLatestWorkflow] = useState<WorkflowRun | null>(null);
  const [artifact, setArtifact] = useState<FirmwareArtifact | null>(null);
  const [firmware, setFirmware] = useState<ArrayBuffer | null>(null);
  const [customFlashStatus, setCustomFlashStatus] = useState('');
  const [error, setError] = useState<unknown>(null);
  const optionsUrl = chrome.runtime.getURL('options/index.html');
  const configured = owner && repo && workflow_id && token;
  const visible = useVisibilityChange();

  const headers = {
    authorization: `token ${token}`,
  };
  const ref = 'main';
  const geometry = layout_geometry ?? qmk_layout.geometry;
  const webUsbAvailable = 'usb' in navigator;
  const expectedArtifactName = `${geometry.replaceAll('/', '_')}_${qmk_layout.id}`;

  // threading? IDK
  const getLatestRunStart = async () => {
    return latestWorkflowRun;
  };

  const runAction = async () => {
    if (!store_layout_geometry) {
      setQmkLayout(qmk_layout.update());
      setLayoutGeometry(qmk_layout.geometry);
    }

    setArtifact(null);
    setFirmware(null);
    setCustomFlashStatus('');
    setArtifactProgress(ArtifactProgress.IDLE);

    const inputs = {
      layout_geometry: layout_geometry ?? qmk_layout.geometry,
      layout_id: qmk_layout.id,
    };
    setProgress(Progress.RUNNING);
    latestWorkflowRun = new Date();
    // Wait 1 second to compensate for any clock skew
    await new Promise(r => setTimeout(r, 1_000));
    try {
      const result = await request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
        owner,
        repo,
        workflow_id,
        ref,
        inputs,
        headers,
      });
      console.log('workflow run: ', result);
      setError(null);
      await new Promise(r => setTimeout(r, WAIT_INTERVAL));
      await refresh();
    } catch (error) {
      setProgress(Progress.FAILED);
      setError(error);
    }
  };

  const refresh = async () => {
    if (!visible || !configured || progress == Progress.FETCHING) return;
    setProgress(Progress.FETCHING);
    const workflows = await request('GET /repos/{owner}/{repo}/actions/runs', {
      owner,
      repo,
      headers,
    });
    const newLatestWorkflow = workflows.data?.workflow_runs?.[0] as WorkflowRun | undefined;
    if (!newLatestWorkflow) {
      setProgress(Progress.FAILED);
      return;
    }
    const latestWorkflowStart = newLatestWorkflow?.run_started_at ? new Date(newLatestWorkflow.run_started_at) : null;
    const latestRunStart = await getLatestRunStart();
    // Github doesn't return the new workflow for a while, so wait until we get one that started after the button was clicked.
    if (!latestWorkflowStart || !latestRunStart || latestWorkflowStart > latestRunStart) {
      setProgress(Progress.FETCHED);
    } else {
      setProgress(Progress.WAITING);
    }
    console.log('workflow data: ', workflows.data);
    setLatestWorkflow(newLatestWorkflow);
    // No need to get artifact data if workflow hasn't changed or is in progress
    if (
      (newLatestWorkflow.id == latestWorkflow?.id && newLatestWorkflow.status == latestWorkflow?.status) ||
      newLatestWorkflow.status == WorkflowStatus.IN_PROGRESS
    ) {
      return;
    }
    const run_id = newLatestWorkflow.id;
    if (!run_id) {
      setProgress(Progress.FAILED);
      return;
    }
    setArtifactProgress(ArtifactProgress.FETCHING);
    const artifacts = await request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts', {
      owner,
      repo,
      run_id,
    });
    const matchingArtifact = (artifacts?.data?.artifacts ?? []).find(
      (item: FirmwareArtifact) => item.name === expectedArtifactName && !item.expired,
    ) as FirmwareArtifact | undefined;
    if (matchingArtifact) {
      setArtifact(matchingArtifact);
      setArtifactProgress(ArtifactProgress.FETCHED);
      if (webUsbAvailable) {
        try {
          const downloaded = await downloadFirmwareFromArtifact(owner, repo, matchingArtifact.id, token, geometry);
          setFirmware(downloaded.firmware);
        } catch (downloadError) {
          setError(downloadError);
        }
      }
    } else {
      setArtifactProgress(ArtifactProgress.FAILED);
    }
    console.log('artifact data: ', artifacts);
  };

  useEffect(() => {
    (async () => {
      refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onCustomFirmwareUsed = () => setCustomFlashStatus('Oryx is using the custom build');
    const onCustomFirmwareError = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setCustomFlashStatus(detail || 'Oryx could not use the custom firmware');
    };
    document.addEventListener('oryx-custom-firmware-used', onCustomFirmwareUsed);
    document.addEventListener('oryx-custom-firmware-error', onCustomFirmwareError);
    return () => {
      document.removeEventListener('oryx-custom-firmware-used', onCustomFirmwareUsed);
      document.removeEventListener('oryx-custom-firmware-error', onCustomFirmwareError);
    };
  }, []);

  useEffect(() => {});

  useInterval(async () => {
    if (progress !== Progress.RUNNING) {
      await refresh();
    }
  }, WAIT_INTERVAL);

  const downloadLatestArtifact = async () => {
    // TODO: Github API always returns "You must have the actions scope to
    // download artifacts", no matter what scopes are enabled for the PAT.
    //
    // Ideally we'd use the API to get the artifact URL
    // const downloadUrl = await request('GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}', {
    //   owner,
    //   repo,
    //   artifact_id,
    //   archive_format: 'zip',
    // });

    // but this works I guess
    if (artifact && latestWorkflow) {
      window.open(`https://github.com/${owner}/${repo}/actions/runs/${latestWorkflow.id}/artifacts/${artifact.id}`);
    }
  };

  const saveCustomBuildToKeyboard = () => {
    if (!firmware) return;
    if (document.documentElement.dataset.oryxCustomFirmwareBridge !== 'ready') {
      setError(new Error('Oryx’s flashing flow is not ready yet. Reload the Oryx page and try again.'));
      return;
    }

    const saveButton = Array.from(document.querySelectorAll('button')).find(
      button => button.textContent?.trim().toLowerCase() === 'save to my keyboard',
    );
    if (!saveButton) {
      setError(new Error('Oryx’s Save to my keyboard button was not found. Reload the layout and try again.'));
      return;
    }

    try {
      setCustomFlashStatus('Opening Oryx with the custom build…');
      document.dispatchEvent(new CustomEvent('oryx-custom-firmware-arm', { detail: toBase64(firmware) }));
      saveButton.click();
    } catch (flashError) {
      setCustomFlashStatus('Could not start Oryx’s flash flow');
      setError(flashError);
    }
  };

  if (!qmk_layout.id) {
    // not on a layout page
    return null;
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded bg-transparent px-2 py-1"
      id="oryx-build-extension-container">
      {configured ? (
        progress == Progress.RUNNING ? (
          <div>
            <Button disabled>Running...</Button> Device: {layout_geometry} Layout: {qmk_layout.id}
          </div>
        ) : (
          <Button onClick={runAction}>Run Github Workflow</Button>
        )
      ) : (
        <a id="options_link" href={optionsUrl} target="_blank" rel="noreferrer">
          Extension unconfigured, click to open options to configure
        </a>
      )}

      {qmk_layout.error && (
        <div>
          <p>{qmk_layout.error.message}</p>
          <p>
            If ZSA has come out with a new type of keyboard, file an support request&nbsp;
            <a
              href="https://github.com/nivekmai/oryx-build-extension/issues"
              target="_blank"
              rel="noreferrer"
              className="underline hover:bg-sky-200 hover:dark:text-black">
              here
            </a>
            .
          </p>
        </div>
      )}
      {configured && (
        <div>
          {progress == Progress.FAILED && 'Failed to run workflow'}
          {typeof error === 'object' &&
            error !== null &&
            'status' in error &&
            error.status == 403 &&
            " Permission error! Make sure you've allowed write for the 'Actions' scope for your access token. "}
          {error instanceof Error && <span role="alert">{error.message}</span>}
          {progress == Progress.WAITING && 'Waiting for latest workflow to start...'}
          {progress == Progress.FETCHING && 'Getting latest workflow runs...'}
          {progress == Progress.FETCHED &&
            (() => {
              switch (latestWorkflow?.status) {
                case WorkflowStatus.PENDING:
                case WorkflowStatus.REQUESTED:
                case WorkflowStatus.WAITING:
                case WorkflowStatus.QUEUED:
                  return (
                    <a href={latestWorkflow.html_url} target="_blank" rel="noreferrer">
                      Latest workflow (started at {workflowDate(latestWorkflow)}) is queued...
                    </a>
                  );
                case WorkflowStatus.IN_PROGRESS:
                  return (
                    <a href={latestWorkflow.html_url} target="_blank" rel="noreferrer">
                      Latest workflow (started at {workflowDate(latestWorkflow)}) is in progress...
                    </a>
                  );
                case WorkflowStatus.ACTION_REQUIRED:
                case WorkflowStatus.CANCELLED:
                case WorkflowStatus.FAILURE:
                case WorkflowStatus.TIMED_OUT:
                case WorkflowStatus.SKIPPED:
                case WorkflowStatus.STALE:
                case WorkflowStatus.NEUTRAL:
                  return (
                    <a href={latestWorkflow.html_url} target="_blank" rel="noreferrer">
                      Latest workflow (started at {workflowDate(latestWorkflow)}) needs attention, click to open Github.
                    </a>
                  );
                case WorkflowStatus.SUCCESS:
                case WorkflowStatus.COMPLETED:
                  return (
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={latestWorkflow.html_url} target="_blank" rel="noreferrer">
                        Latest workflow (started at {workflowDate(latestWorkflow)})
                      </a>{' '}
                      is complete:&nbsp;
                      {(() => {
                        switch (artifactProgress) {
                          case ArtifactProgress.IDLE:
                          case ArtifactProgress.FETCHING:
                            return 'Getting artifact for latest workflow...';
                          case ArtifactProgress.FETCHED:
                            return artifact ? (
                              <>
                                <Button onClick={downloadLatestArtifact}>Download</Button>
                                {customFlashStatus && (
                                  <span role="status" className="text-sm">
                                    {customFlashStatus}
                                  </span>
                                )}
                                {firmware && webUsbAvailable && (
                                  <Button
                                    onClick={saveCustomBuildToKeyboard}
                                    title="Flash this custom firmware build to your keyboard using Oryx">
                                    Flash custom build
                                  </Button>
                                )}
                              </>
                            ) : (
                              <a href={latestWorkflow.html_url} target="_blank" rel="noreferrer">
                                Artifact Missing! Click to open workflow page.
                              </a>
                            );
                          case ArtifactProgress.FAILED:
                            return (
                              <a href={latestWorkflow.html_url} target="_blank" rel="noreferrer">
                                Failed to fetch artifact! Click to open workflow page.
                              </a>
                            );
                        }
                      })()}
                    </div>
                  );
                default:
                  return `Latest workflow has unhandled status ${latestWorkflow?.status}`;
              }
            })()}
        </div>
      )}
    </div>
  );
}
