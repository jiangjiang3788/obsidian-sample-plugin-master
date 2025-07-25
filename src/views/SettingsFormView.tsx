// src/views/SettingsFormView.tsx
import { useState } from 'preact/hooks';
import ThinkPlugin from '../main';

interface SettingsFormViewProps {
  /** 设置的 key，默认 'inputSettings' */
  storageKey?: string;
  /** plugin 实例由 Dashboard 注入 */
  plugin: ThinkPlugin;
}

export function SettingsFormView({ storageKey = 'inputSettings', plugin }: SettingsFormViewProps) {
  const init = (plugin as any)[storageKey] || {};
  const [form, setForm] = useState<Record<string, any>>(
    typeof structuredClone === 'function' ? structuredClone(init) : JSON.parse(JSON.stringify(init))
  );

  const change = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    (plugin as any)[storageKey] = form; // 写入内存
    // 写回 dashboards + inputSettings（保持其它字段不丢）
    await plugin.persistAll();
    alert('已保存配置');
  };

  /* —— 下面是你需要的字段；可继续加 —— */
  return (
    <div style="display:flex;flex-direction:column;gap:6px;max-width:420px;">
      <label>
        主题 (可层级“生活/健康”)：
        <input
          value={form.topic || ''}
          onInput={e => change('topic', (e.target as HTMLInputElement).value)}
        />
      </label>

      <label>
        图标 (emoji)：
        <input
          value={form.icon || ''}
          onInput={e => change('icon', (e.target as HTMLInputElement).value)}
          placeholder="✨"
        />
      </label>

      <label>
        任务字段清单 (逗号分隔)：
        <input
          value={form.taskFields || ''}
          onInput={e => change('taskFields', (e.target as HTMLInputElement).value)}
          placeholder="status,icon,repeat,…"
        />
      </label>

      <label>
        Block 字段清单 (逗号分隔)：
        <input
          value={form.blockFields || ''}
          onInput={e => change('blockFields', (e.target as HTMLInputElement).value)}
          placeholder="分类,周期,日期,主题,图标,内容"
        />
      </label>

      <button style="margin-top:8px;" onClick={save}>💾 保存配置</button>
    </div>
  );
}
