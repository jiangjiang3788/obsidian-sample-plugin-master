// src/ui/modals/QuickHabitModal.tsx
/** @jsxImportSource preact */
import { App, Modal, Notice } from 'obsidian';
import { h } from 'preact';
import { render } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import type ThinkPlugin from '../../main';
import { InputService } from '../../services/inputService';
import { makeBlock } from '../../utils/templates';

function todayISO() { return (window as any).moment().format('YYYY-MM-DD'); }

export class QuickHabitModal extends Modal {
  constructor(private plugin: ThinkPlugin) { super(plugin.app); }
  onOpen() { render(<HabitForm app={this.app} plugin={this.plugin} close={()=>this.close()}/>, this.contentEl); }
  onClose() { this.contentEl.empty(); }
}

type Preset = {
  tag: string;
  starCount?: number;
  displayMode?: 'image'|'emoji';
  emojiMapping?: string[];
  imageMapping?: string[];
};

function HabitForm({ app, plugin, close }: { app: App; plugin: ThinkPlugin; close: ()=>void; }) {
  const svc = new InputService(app, plugin);

  const baseCfg = plugin.inputSettings?.base?.blocks?.['打卡'] || {};
  const presets: Preset[] = baseCfg.presets || [];

  // 预设选择（按 tag）
  const [idx, setIdx] = useState(0);
  const cur = presets[idx] || {};
  const [dateISO, setDateISO] = useState(todayISO());
  const [score, setScore] = useState<number>(1);
  const [content, setContent] = useState('');

  // 主题选择：根据预设 tag 顶层匹配（健康/睡眠 -> 顶层=健康）
  const top = (cur.tag || '').split('/')[0] || '生活';
  const themes = useMemo(()=>svc.listTaskThemesByTop(top, 'block', '打卡'), [top, idx]);
  const [themePath, setThemePath] = useState(themes[0]?.path || top);
  useEffect(()=>{ setThemePath(themes[0]?.path || top); }, [top]);

  useEffect(()=>{
    const max = cur.starCount || 5;
    if (score > max) setScore(max);
    if (score < 1) setScore(1);
  }, [idx]);

  const onSubmit = async () => {
    if (!cur.tag) { new Notice('请先配置打卡 presets'); return; }
    const themeIcon = (themes.find(t=>t.path===themePath)?.icon) || '';

    const block = makeBlock({
      category: '打卡',
      dateISO,
      themeLabel: top,
      icon: themeIcon,
      content,
      tags: [themePath, cur.tag],         // 同时写入主题标签与 preset 的 tag
      extra: { '评分': score },
    });

    try {
      await svc.writeBlock(themePath, '打卡', null, block);
      new Notice('已保存打卡');
      plugin.dataStore?.notifyChange?.();
      close();
    } catch (e: any) {
      new Notice('保存失败：' + e.message);
    }
  };

  const max = cur.starCount || 5;

  return (
    <div class="think-modal">
      <h3>快速录入 · 打卡</h3>

      <div class="setting-item"><div class="setting-item-name">预设</div>
        <div class="setting-item-control">
          <select value={idx} onChange={e=>setIdx(Number((e.target as HTMLSelectElement).value))} style="min-width:260px;">
            {presets.map((p,i)=> <option value={i}>{p.tag || '(未命名)'}</option>)}
          </select>
        </div>
      </div>

      <div class="setting-item"><div class="setting-item-name">主题</div>
        <div class="setting-item-control">
          <select value={themePath} onChange={e=>setThemePath((e.target as HTMLSelectElement).value)} style="min-width:260px;">
            {themes.map(t=> <option value={t.path}>{t.icon ? `${t.icon} ` : ''}{t.path}</option>)}
          </select>
        </div>
      </div>

      <div class="setting-item"><div class="setting-item-name">日期</div>
        <div class="setting-item-control">
          <input type="date" value={dateISO} onChange={e=>setDateISO((e.target as HTMLInputElement).value)} />
        </div>
      </div>

      <div class="setting-item"><div class="setting-item-name">评分</div>
        <div class="setting-item-control">
          <input type="number" min={1} max={max} value={score} onInput={e=>setScore(Number((e.target as HTMLInputElement).value))}/>
          <span style="margin-left:8px;">(1 ~ {max})</span>
        </div>
      </div>

      <div class="setting-item"><div class="setting-item-name">内容</div>
        <div class="setting-item-control">
          <textarea rows={5} placeholder="备注…" onInput={e=>setContent((e.target as HTMLTextAreaElement).value)} />
        </div>
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
        <button class="mod-cta" onClick={onSubmit}>提交 ↩︎</button>
        <button onClick={close}>取消</button>
      </div>
    </div>
  );
}