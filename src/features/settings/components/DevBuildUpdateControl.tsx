/** @jsxImportSource preact */
import { useEffect, useState } from 'preact/hooks';
import { ThinkButton, ThinkNotice } from '@shared/ui/public';

export interface DevBuildMeta {
  remoteVersion: string;
  branch: string;
  /** GitHub push event time for this exact revision, when available. */
  githubPushedAt: string | null;
  /** Committer timestamp of the exact revision, not an upload timestamp. */
  githubCommitAt: string | null;
  commitSha: string;
}

export interface DevBuildUpdateControlProps {
  currentVersion?: string;
  onInspectDevBuild?: () => Promise<DevBuildMeta>;
  onPullDevBuild: (preview?: DevBuildMeta | null) => Promise<DevBuildMeta>;
}

type UpdateState =
  | { kind: 'idle'; message: '' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

/** The device's local timezone is used for display; GitHub returns ISO/UTC. */
export function formatGitHubCommitTime(value: string | null | undefined): string {
  if (!value || !Number.isFinite(Date.parse(value))) return '暂不可用';
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export function DevBuildUpdateControl({ currentVersion, onInspectDevBuild, onPullDevBuild }: DevBuildUpdateControlProps) {
  const [updating, setUpdating] = useState(false);
  const [checking, setChecking] = useState(Boolean(onInspectDevBuild));
  const [preview, setPreview] = useState<DevBuildMeta | null>(null);
  const [checkError, setCheckError] = useState('');
  const [state, setState] = useState<UpdateState>({ kind: 'idle', message: '' });

  useEffect(() => {
    if (!onInspectDevBuild) return;
    let mounted = true;
    setChecking(true);
    onInspectDevBuild().then((info) => {
      if (mounted) { setPreview(info); setCheckError(''); }
    }).catch(() => {
      if (mounted) setCheckError('远端版本信息暂不可用，可直接尝试下载');
    }).finally(() => {
      if (mounted) setChecking(false);
    });
    return () => { mounted = false; };
  }, [onInspectDevBuild]);

  const handlePull = async () => {
    if (updating) return;
    setUpdating(true);
    setState({ kind: 'idle', message: '' });
    try {
      const result = await onPullDevBuild(preview);
      const versionText = currentVersion ? `${currentVersion} → ${result.remoteVersion}` : result.remoteVersion;
      const time = result.githubPushedAt
        ? `GitHub 推送时间（本地）：${formatGitHubCommitTime(result.githubPushedAt)}`
        : `GitHub 推送时间：暂未查到该版本的推送记录；Git 提交时间（非推送时间）：${formatGitHubCommitTime(result.githubCommitAt)}`;
      setPreview(result);
      setState({
        kind: 'success',
        message: `已拉取 GitHub ${result.branch} 开发版（${versionText}）。${time}。请完全关闭并重新打开 Obsidian。`,
      });
    } catch (error) {
      setState({ kind: 'error', message: `拉取失败：${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="think-settings-stack think-settings-stack--tight">
      <div className="think-settings-row think-settings-row--top">
        <span className="think-settings-row__label think-settings-row__label--top">GitHub 开发版</span>
        <div className="think-settings-row__body think-settings-stack think-settings-stack--tight">
          {preview ? (
            <span className="think-settings-help" data-github-commit-time>
              远端版本：{preview.remoteVersion} · {preview.githubPushedAt
                ? `GitHub 推送时间（本地）：${formatGitHubCommitTime(preview.githubPushedAt)}`
                : `GitHub 推送时间：暂未查到该版本的推送记录；Git 提交时间（非推送时间）：${formatGitHubCommitTime(preview.githubCommitAt)}`}
            </span>
          ) : checking ? <span className="think-settings-help">正在读取 GitHub 版本与提交时间…</span>
            : checkError ? <span className="think-settings-help">{checkError}</span> : null}
          <ThinkButton variant="secondary" size="sm" loading={updating} onClick={() => { void handlePull(); }}>
            {updating ? '正在拉取…' : '从 GitHub 拉取最新开发版'}
          </ThinkButton>
          <span className="think-settings-help">从 main 分支同一 SHA 下载三个插件文件，逐一校验写入，失败自动回滚。能匹配到该 SHA 的 PushEvent 才显示 GitHub 推送时间；否则明确标为提交时间（不是上传时间）。</span>
          {state.kind !== 'idle' ? <ThinkNotice tone={state.kind === 'success' ? 'success' : 'danger'}>{state.message}</ThinkNotice> : null}
        </div>
      </div>
    </div>
  );
}
