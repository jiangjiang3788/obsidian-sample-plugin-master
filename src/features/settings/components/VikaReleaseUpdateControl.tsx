/** @jsxImportSource preact */
import { useEffect, useRef, useState } from 'preact/hooks';
import { ThinkButton, ThinkNotice } from '@shared/ui/public';

/** UI contract deliberately does not import the Obsidian platform layer. */
export interface VikaReleaseMeta {
  remoteVersion: string;
  buildId: string;
  localBuildId: string | null;
  uploadedAt: number;
  recordId: string;
  isNewBuild: boolean;
}
export interface VikaUpdateActions {
  supported: boolean;
  hasToken: () => boolean;
  saveToken: (token: string) => Promise<void>;
  inspect: () => Promise<VikaReleaseMeta>;
  pull: () => Promise<VikaReleaseMeta>;
}

function time(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '未知';
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}
function short(id: string | null | undefined): string { return id ? id.slice(0, 12) : '本地文件不完整'; }
function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }

export function VikaReleaseUpdateControl({ actions }: { actions: VikaUpdateActions }) {
  const [configured, setConfigured] = useState(() => actions.hasToken());
  const [editingToken, setEditingToken] = useState(() => !actions.hasToken());
  const [tokenInput, setTokenInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [remote, setRemote] = useState<VikaReleaseMeta | null>(null);
  const [status, setStatus] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // Do not query a private API on page load without a credential. Keep this manual.
  useEffect(() => { setConfigured(actionsRef.current.hasToken()); }, []);

  const saveToken = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await actions.saveToken(tokenInput);
      setTokenInput('');
      setConfigured(true);
      setEditingToken(false);
      setRemote(null);
      setStatus({ tone: 'success', text: 'API 令牌已保存至 Think/data.json（明文，请勿公开或提交 Git）。' });
    } catch (error) {
      setStatus({ tone: 'danger', text: `保存失败：${message(error)}` });
    } finally { setBusy(false); }
  };
  const inspect = async () => {
    if (busy) return;
    setBusy(true); setStatus(null);
    try {
      const info = await actions.inspect();
      setRemote(info);
      setStatus({ tone: 'success', text: info.isNewBuild
        ? '检测到新构建（即使 manifest.json 版本号未变也可安装）。'
        : '本地三个插件文件的内容指纹与云端一致，无需重新下载。' });
    } catch (error) { setStatus({ tone: 'danger', text: `检查失败：${message(error)}` }); }
    finally { setBusy(false); }
  };
  const install = async () => {
    if (busy) return;
    setBusy(true); setStatus(null);
    try {
      const info = await actions.pull();
      setRemote({ ...info, localBuildId: info.buildId, isNewBuild: false });
      setStatus({ tone: 'success', text: info.isNewBuild
        ? `已安装构建 ${short(info.buildId)}。请完全关闭并重新打开 Obsidian。`
        : '当前本地三个文件已与云端一致，无需下载。' });
    } catch (error) { setStatus({ tone: 'danger', text: `更新失败：${message(error)}` }); }
    finally { setBusy(false); }
  };

  return (
    <div className="think-settings-stack think-settings-stack--tight">
      <div className="think-settings-row think-settings-row--top">
        <span className="think-settings-row__label think-settings-row__label--top">维格表云端更新</span>
        <div className="think-settings-row__body think-settings-stack think-settings-stack--tight">
          <span className="think-settings-help">云端每次上传 main.js、styles.css、manifest.json 三个独立文件。通过文件内容指纹判断更新，不要求修改正式版本号。</span>
          <>
              {configured && !editingToken ? (
                <div className="think-settings-stack think-settings-stack--tight">
                  <span className="think-settings-help">API 令牌保存在 Think/data.json 中（明文，会随 Vault 同步）。请勿公开或提交 Git。</span>
                  <ThinkButton variant="secondary" size="sm" onClick={() => setEditingToken(true)}>更换 API 令牌</ThinkButton>
                </div>
              ) : (
                <div className="think-settings-stack think-settings-stack--tight">
                  <label className="think-settings-help" htmlFor="think-vika-api-token">维格表 API 令牌（保存在 Think/data.json）</label>
                  <input id="think-vika-api-token" type="password" value={tokenInput} autoComplete="off" spellcheck={false}
                    placeholder="保存至 Think/data.json，不会写入插件代码" onInput={(e: Event) => setTokenInput((e.currentTarget as HTMLInputElement).value)} />
                  <ThinkButton variant="secondary" size="sm" loading={busy} onClick={() => { void saveToken(); }}>保存到 Think/data.json</ThinkButton>
                </div>
              )}
              {configured ? (
                <div className="think-settings-stack think-settings-stack--tight">
                  {remote ? (
                    <span className="think-settings-help">
                      云端版本：{remote.remoteVersion} · 云端构建：{short(remote.buildId)}
                      {' · '}本地构建：{short(remote.localBuildId)}
                      {' · '}上传时间：{time(remote.uploadedAt)}
                      {' · '}{remote.isNewBuild ? '有可用更新' : '内容已一致'}
                    </span>
                  ) : <span className="think-settings-help">点击“检查更新”读取维格表最新构建和上传时间。</span>}
                  <ThinkButton variant="secondary" size="sm" loading={busy} onClick={() => { void inspect(); }}>
                    {busy ? '正在处理…' : '检查维格表更新'}
                  </ThinkButton>
                  {remote?.isNewBuild ? (
                    <ThinkButton variant="primary" size="sm" loading={busy} onClick={() => { void install(); }}>
                      下载并安装云端构建
                    </ThinkButton>
                  ) : null}
                </div>
              ) : null}
          </>
          {status ? <ThinkNotice tone={status.tone}>{status.text}</ThinkNotice> : null}
        </div>
      </div>
    </div>
  );
}
