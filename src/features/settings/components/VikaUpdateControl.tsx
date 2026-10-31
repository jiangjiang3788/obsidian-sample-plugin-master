/** @jsxImportSource preact */
import { useState } from 'preact/hooks';
import { ThinkButton, ThinkNotice } from '@shared/ui/public';

export interface VikaUpdateActions {
  configureToken: () => void;
  update: () => Promise<boolean>;
}

export function VikaUpdateControl({ vika }: { vika: VikaUpdateActions }) {
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  const download = async () => {
    if (updating) return;
    setUpdating(true);
    setMessage('');
    try {
      if (await vika.update()) {
        setMessage('更新已安装，请完全退出并重新打开 Obsidian。');
        setError(false);
      }
    } catch (err) {
      setMessage(`维格表更新失败：${err instanceof Error ? err.message : String(err)}`);
      setError(true);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="think-settings-row think-settings-row--top">
      <span className="think-settings-row__label think-settings-row__label--top">维格表（Vika）更新</span>
      <div className="think-settings-row__body think-settings-stack think-settings-stack--tight">
        <ThinkButton variant="secondary" size="sm" disabled={updating} onClick={vika.configureToken}>
          设置 / 修改 API 令牌
        </ThinkButton>
        <ThinkButton variant="secondary" size="sm" loading={updating} onClick={() => { void download(); }}>
          {updating ? '正在检查并下载…' : '从维格表下载最新构建'}
        </ThinkButton>
        {message ? <ThinkNotice tone={error ? 'danger' : 'success'}>{message}</ThinkNotice> : null}
      </div>
    </div>
  );
}
