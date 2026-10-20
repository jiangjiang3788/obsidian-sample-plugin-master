/** @jsxImportSource preact */
import { useEffect, useRef, useState } from 'preact/hooks';
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
  /** Optional preview pins an already inspected SHA, not the current main. */
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
  const [showPinnedFallback, setShowPinnedFallback] = useState(false);
  // The parent builds an inline callback on render. Do not treat its new
  // identity as a reason to spend more unauthenticated GitHub API requests.
  const inspectRef = useRef(onInspectDevBuild);
  inspectRef.current = onInspectDevBuild;

  useEffect(() => {
    const inspect = inspectRef.current;
    if (!inspect) return;
    let mounted = true;
    setChecking(true);
    inspect().then((info) => {
      if (mounted) { setPreview(info); setCheckError(''); }
    }).catch((error) => {
      if (mounted) setCheckError(`检查 GitHub 版本失败：${error instanceof Error ? error.message : String(error)}`);
    }).finally(() => {
      if (mounted) setChecking(false);
    });
    return () => { mounted = false; };
  }, []);

  const handlePull = async (pinnedPreview: DevBuildMeta | null = null) => {
    if (updating) return;
    setUpdating(true);
    setShowPinnedFallback(false);
    setState({ kind: 'idle', message: '' });
    try {
      // Normal click refreshes main; only the separate fallback action pins a preview.
      const result = await onPullDevBuild(pinnedPreview);
      const versionText = currentVersion ? `${currentVersion} → ${result.remoteVersion}` : result.remoteVersion;
      const time = result.githubPushedAt
        ? `GitHub 推送时间（本地）：${formatGitHubCommitTime(result.githubPushedAt)}`
        : `GitHub 推送时间：暂未查到该版本的推送记录；Git 提交时间（非推送时间）：${formatGitHubCommitTime(result.githubCommitAt)}`;
      setPreview(result);
      setState({
        kind: 'success',
        message: `已拉取 GitHub ${result.branch} 开发版（${versionText}，SHA ${result.commitSha.slice(0, 7)}）。${time}。${pinnedPreview ? '本次安装的是之前检查的 SHA，未验证它仍为最新。' : ''}请完全关闭并重新打开 Obsidian。`,
      });
    } catch (error) {
      // Only offer an explicit older-SHA fallback when resolving main failed.
      // A raw-file 403 must not be masked by repeatedly downloading it.
      const isHeadError = Boolean(error && typeof error === 'object' &&
        'requestStage' in error && error.requestStage === 'head');
      setShowPinnedFallback(!pinnedPreview && isHeadError && Boolean(preview));
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
              远端版本：{preview.remoteVersion} · SHA：{preview.commitSha.slice(0, 7)} · {preview.githubPushedAt
                ? `GitHub 推送时间（本地）：${formatGitHubCommitTime(preview.githubPushedAt)}`
                : `${state.kind === 'success' ? 'GitHub 推送时间：暂未查到对应推送记录' : 'GitHub 推送时间：安装后查询'}；Git 提交时间（非推送时间）：${formatGitHubCommitTime(preview.githubCommitAt)}`}
            </span>
          ) : checking ? <span className="think-settings-help">正在读取 GitHub 版本与提交时间…</span>
            : checkError ? <span className="think-settings-help">{checkError}</span> : null}
          <ThinkButton variant="secondary" size="sm" loading={updating} onClick={() => { void handlePull(); }}>
            {updating ? '正在拉取…' : '从 GitHub 拉取最新开发版'}
          </ThinkButton>
          {showPinnedFallback && preview && !updating ? (
            <ThinkButton variant="secondary" size="sm" onClick={() => { void handlePull(preview); }}>
              下载已检查的 {preview.commitSha.slice(0, 7)}（可能不是最新）
            </ThinkButton>
          ) : null}
          <span className="think-settings-help">正常下载会重新检查 main 最新 SHA，并校验三个插件文件，失败自动回滚。推送时间只在成功安装后尝试查询一次；若 GitHub 拒绝查询最新提交，可明确选择已检查的 SHA（可能不是最新）。</span>
          {state.kind !== 'idle' ? <ThinkNotice tone={state.kind === 'success' ? 'success' : 'danger'}>{state.message}</ThinkNotice> : null}
        </div>
      </div>
    </div>
  );
}
