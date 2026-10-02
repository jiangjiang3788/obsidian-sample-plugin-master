/** @jsxImportSource preact */
import { useState } from 'preact/hooks';
import { ThinkButton, ThinkNotice } from '@shared/ui/public';

export interface DevBuildUpdateControlProps {
  currentVersion?: string;
  onPullDevBuild: () => Promise<{ remoteVersion: string; branch: string }>;
}

type UpdateState =
  | { kind: 'idle'; message: '' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export function DevBuildUpdateControl({ currentVersion, onPullDevBuild }: DevBuildUpdateControlProps) {
  const [updating, setUpdating] = useState(false);
  const [state, setState] = useState<UpdateState>({ kind: 'idle', message: '' });

  const handlePull = async () => {
    if (updating) return;
    setUpdating(true);
    setState({ kind: 'idle', message: '' });

    try {
      const result = await onPullDevBuild();
      const versionText = currentVersion
        ? `${currentVersion} → ${result.remoteVersion}`
        : result.remoteVersion;
      setState({
        kind: 'success',
        message: `已拉取 GitHub ${result.branch} 开发版（${versionText}）。请完全关闭并重新打开 Obsidian。`,
      });
    } catch (error) {
      setState({
        kind: 'error',
        message: `拉取失败：${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="think-settings-stack think-settings-stack--tight">
      <div className="think-settings-row think-settings-row--top">
        <span className="think-settings-row__label think-settings-row__label--top">GitHub 开发版</span>
        <div className="think-settings-row__body think-settings-stack think-settings-stack--tight">
          <ThinkButton variant="secondary" size="sm" loading={updating} onClick={() => { void handlePull(); }}>
            {updating ? '正在拉取…' : '从 GitHub 拉取最新开发版'}
          </ThinkButton>
          <span className="think-settings-help">从公开仓库 main 分支下载 main.js、manifest.json、styles.css；全部下载并校验成功后才覆盖本地插件。</span>
          {state.kind !== 'idle' ? (
            <ThinkNotice tone={state.kind === 'success' ? 'success' : 'danger'}>{state.message}</ThinkNotice>
          ) : null}
        </div>
      </div>
    </div>
  );
}
