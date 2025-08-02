// src/ui/modals/QuickTaskModal.tsx
/** @jsxImportSource preact */
import { App, Modal, Notice } from 'obsidian';
import { h } from 'preact';
import { render } from 'preact';
import { useState } from 'preact/hooks';
import type ThinkPlugin from '../../main';
import { InputService } from '../../services/inputService';
import { makeTaskLine, lastSegment } from '../../utils/templates';
import { EMOJI } from '../../config/constants';

function todayISO() {
  // Obsidian 带的 moment
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
  onClose() { this.contentEl.empty(); }
}

function TaskForm({ app, plugin, close }: { app: App; plugin: ThinkPlugin; close: () => void; }) {
  const svc = new InputService(app, plugin);

  const [top, setTop] = useState<'工作'|'电脑'|'生活'|'其他'>('生活');
  const themes = svc.listThemesByTop(top, 'task');
  const [themePath, setThemePath] = useState(themes[0]?.path || top);
  const currentTheme = themes.find(t => t.path === themePath);
  const themeIcon = currentTheme?.icon || '';

  const [status, setStatus] = useState<'✅'|'📅'|'🛫'>('📅');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(nowHHMM());
  const [duration, setDuration] = useState<string>('');
  const [repeat, setRepeat] = useState<'none'|'day'|'week'|'month'|'year'>('none');

  const onSubmit = async () => {
    if (!title.trim()) { new Notice('请填写任务内容'); return; }

    // 前缀：按你的映射
    let prefix: '- [ ] ' | '- [x] ' | '- [-] ' | '' = '';
    let markEmoji: string | undefined;
    if (status === '✅') { prefix = '- [x] '; markEmoji = EMOJI.done; }
    else if (status === '📅') { prefix = '- [ ] '; }
    else if (status === '🛫') { prefix = '- [ ] '; }

    const line = makeTaskLine({
      prefix,
      title,
      themePath,                    // 单个路径标签 #电脑/记录系统
      icon: themeIcon,
      due: status === '📅' ? date : undefined,
      start: status === '🛫' ? date : undefined,
      timeHHMM: time,
      duration: duration || undefined,
      repeat: repeat === 'none' ? null : repeat,
      statusEmoji: markEmoji,
      markDate: markEmoji ? date : undefined,
    });

    try {
      await new InputService(app, plugin).writeTask(themePath, null, line);
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
          {(['工作','电脑','生活','其他'] as const).map(t => (
            <label style="margin-right:8px;">
              <input type="radio" name="top" checked={top===t} onChange={()=>{ setTop(t); const ts = svc.listThemesByTop(t,'task'); setThemePath(ts[0]?.path || t); }}/>
              <span style="margin-left:4px;">{t}</span>
            </label>
          ))}
        </div>
      </div>

      <div class="setting-item"><div class="setting-item-name">主题</div>
        <div class="setting-item-control">
          <select value={themePath} onChange={e=>setThemePath((e.target as HTMLSelectElement).value)} style="min-width:240px;">
            {svc.listThemesByTop(top,'task').map(t=>(
              <option value={t.path}>{t.icon ? `${t.icon} ` : ''}{t.path}</option>
            ))}
          </select>
        </div>
      </div>

      <div class="setting-item"><div class="setting-item-name">任务状态</div>
        <div class="setting-item-control">
          {(['📅','🛫','✅'] as const).map(s=>(
            <label style="margin-right:10px;">
              <input type="radio" name="status" checked={status===s} onChange={()=>setStatus(s)}/>
              <span style="margin-left:4px;font-size:16px;">{s}</span>
            </label>
          ))}
        </div>
      </div>

      <div class="setting-item"><div class="setting-item-name">日期</div>
        <div class="setting-item-control">
          <input type="date" value={date} onChange={e=>setDate((e.target as HTMLInputElement).value)} />
        </div>
      </div>

      <div class="setting-item"><div class="setting-item-name">time</div>
        <div class="setting-item-control">
          <input type="time" value={time} onChange={e=>setTime((e.target as HTMLInputElement).value)} />
        </div>
      </div>

      <div class="setting-item"><div class="setting-item-name">时长</div>
        <div class="setting-item-control">
          <input placeholder="例如 30 或 0:30" value={duration} onInput={e=>setDuration((e.target as HTMLInputElement).value)} />
        </div>
      </div>

      <div class="setting-item"><div class="setting-item-name">重复</div>
        <div class="setting-item-control">
          <select value={repeat} onChange={e=>setRepeat((e.target as HTMLSelectElement).value as any)}>
            <option value="none">不重复</option>
            <option value="day">每天</option>
            <option value="week">每周</option>
            <option value="month">每月</option>
            <option value="year">每年</option>
          </select>
        </div>
      </div>

      <div class="setting-item"><div class="setting-item-name">任务内容</div>
        <div class="setting-item-control">
          <input placeholder="输入任务内容…" value={title} onInput={e=>setTitle((e.target as HTMLInputElement).value)} />
        </div>
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
        <button class="mod-cta" onClick={onSubmit}>提交 ↩︎</button>
        <button onClick={close}>取消</button>
      </div>
    </div>
  );
}