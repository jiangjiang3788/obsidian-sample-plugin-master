/** @jsxImportSource preact */
import { App, Modal, Notice } from 'obsidian';
import { h, render } from 'preact';
import { useState } from 'preact/hooks';
import type ThinkPlugin from '../../main';
import { InputService } from '../../services/inputService';
import { makeTaskLine } from '../../utils/templates';
import { EMOJI } from '../../config/constants';

function todayISO() {
  const m = (window as any).moment();
  return m.format('YYYY-MM-DD');
}
function nowHHMM() {
  const m = (window as any).moment();
  return m.format('HH:mm');
}

export class QuickTaskModal extends Modal {
  constructor(private plugin: ThinkPlugin) {
    super(plugin.app);
  }
  onOpen() {
    render(<TaskForm app={this.app} plugin={this.plugin} close={() => this.close()} />, this.contentEl);
  }
  onClose() {
    this.contentEl.empty();
  }
}

function TaskForm({ app, plugin, close }: { app: App; plugin: ThinkPlugin; close: () => void; }) {
  const svc = new InputService(app, plugin);

  const topCategories = svc.getTopCategories();
  const [top, setTop] = useState(topCategories[0] ?? '');
  const themes = svc.listTaskThemesByTop(top);
  const [themePath, setThemePath] = useState(themes[0]?.path || '');
  const currentTheme = themes.find(t => t.path === themePath);
  const themeIcon = currentTheme?.icon || '';
  const fields = currentTheme?.fields ?? [];

  const [form, setForm] = useState<Record<string, string>>({
    '任务内容': '',
    '日期': todayISO(),
    '时间': nowHHMM(),
    '时长': '',
  });

  const updateField = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const onSubmit = async () => {
    const title = form['任务内容']?.trim();
    if (!title) {
      new Notice('请填写任务内容');
      return;
    }

    const line = makeTaskLine({
      prefix: '- [ ] ',
      title,
      themePath,
      icon: themeIcon,
      due: form['日期'],
      timeHHMM: form['时间'],
      duration: form['时长'] || undefined,
    });

    try {
      await svc.writeTask(themePath, null, line);
      new Notice('已保存任务');
      plugin.dataStore?.notifyChange?.();
      close();
    } catch (e: any) {
      new Notice('保存失败：' + e.message);
    }
  };

  return (
    <div class="think-modal">
      <h3>快速录入 · 任务</h3>

      <div class="setting-item"><div class="setting-item-name">大类</div>
        <div class="setting-item-control">
          {topCategories.map(t => (
            <label style="margin-right:8px;">
              <input type="radio" name="top" checked={top === t} onChange={() => {
                setTop(t);
                const ts = svc.listTaskThemesByTop(t);
                setThemePath(ts[0]?.path || '');
              }} />
              <span style="margin-left:4px;">{t}</span>
            </label>
          ))}
        </div>
      </div>

      <div class="setting-item"><div class="setting-item-name">主题</div>
        <div class="setting-item-control">
          <select value={themePath} onChange={e => setThemePath((e.target as HTMLSelectElement).value)} style="min-width:240px;">
            {svc.listTaskThemesByTop(top).map(t => (
              <option value={t.path}>{t.icon ? `${t.icon} ` : ''}{t.path}</option>
            ))}
          </select>
        </div>
      </div>

      {fields.map(field => (
        <div class="setting-item">
          <div class="setting-item-name">{field}</div>
          <div class="setting-item-control">
            <input
              value={form[field] ?? ''}
              placeholder={`输入${field}...`}
              onInput={e => updateField(field, (e.target as HTMLInputElement).value)}
              type={field === '日期' ? 'date' : field === '时间' ? 'time' : 'text'}
            />
          </div>
        </div>
      ))}

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
        <button class="mod-cta" onClick={onSubmit}>提交 ↩︎</button>
        <button onClick={close}>取消</button>
      </div>
    </div>
  );
}
