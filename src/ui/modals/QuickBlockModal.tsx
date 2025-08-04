// src/ui/modals/QuickBlockModal.tsx
/** @jsxImportSource preact */
import { App, Modal, Notice } from 'obsidian';
import { h } from 'preact';
import { render } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type ThinkPlugin from '../../main';
import { InputService } from '../../services/inputService';
import { makeBlock, lastSegment } from '../../utils/templates';

function todayISO() { return (window as any).moment().format('YYYY-MM-DD'); }

export class QuickBlockModal extends Modal {
  constructor(private plugin: ThinkPlugin) {
    super(plugin.app);
  }
  onOpen() { render(<BlockForm app={this.app} plugin={this.plugin} close={()=>this.close()}/>, this.contentEl); }
  onClose() { this.contentEl.empty(); }
}

function BlockForm({ app, plugin, close }: { app: App; plugin: ThinkPlugin; close: ()=>void; }) {
  const svc = new InputService(app, plugin);

  const [category, setCategory] = useState<'计划'|'总结'|'思考'>('思考');
  const [top, setTop] = useState<'生活'|'健康'|'电脑'|'工作'|'其他'>('生活');
  const themes = useMemo(()=>svc.listTaskThemesByTop(top, 'block', category), [top, category]);
  const [themePath, setThemePath] = useState(themes[0]?.path || top);
  const themeIcon = (themes.find(t=>t.path===themePath)?.icon) || '';

  const [dateISO, setDateISO] = useState(todayISO());
  const [content, setContent] = useState('');

  // 从 inputSettings.base.blocks[category].fieldOptions 读取选项
  const base = (plugin.inputSettings?.base?.blocks?.[category]) || {};
  const fieldOptions = base.fieldOptions || {};
  const [period, setPeriod] = useState<string>('');  // 周期
  const [thoughtType, setThoughtType] = useState<string>(''); // 思考分类

  const onSubmit = async () => {
    if (!content.trim()) { new Notice('请填写内容'); return; }

    const tags = [themePath];               // 标签:: 电脑/记录系统
    const themeLabel = top;                 // 主题:: 顶层显示（如 生活/电脑/…）
    const extra: Record<string, any> = {};

    if (category === '计划' || category === '总结') {
      if (Array.isArray(fieldOptions['周期']) && period) extra['周期'] = period;
    } else if (category === '思考') {
      if (Array.isArray(fieldOptions['分类']) && thoughtType) extra['分类'] = thoughtType;
    }

    const blockText = makeBlock({
      category,
      dateISO,
      themeLabel,
      icon: themeIcon,
      content,
      tags,
      extra,
    });

    try {
      await svc.writeBlock(themePath, category, null, blockText);
      new Notice('已保存');
      plugin.dataStore?.notifyChange?.();
      close();
    } catch (e: any) {
      new Notice('保存失败：' + e.message);
    }
  };

  return (
    <div class="think-modal">
      <h3>快速录入 · {category}</h3>

      <div class="setting-item"><div class="setting-item-name">类别</div>
        <div class="setting-item-control">
          {(['计划','总结','思考'] as const).map(c=>(
            <label style="margin-right:10px;">
              <input type="radio" name="cat" checked={category===c} onChange={()=>{ setCategory(c); }} />
              <span style="margin-left:4px;">{c}</span>
            </label>
          ))}
        </div>
      </div>

      <div class="setting-item"><div class="setting-item-name">大类</div>
        <div class="setting-item-control">
          {(['生活','健康','电脑','工作','其他'] as const).map(t=>(
            <label style="margin-right:8px;">
              <input type="radio" name="top" checked={top===t} onChange={()=>{ setTop(t); const ts = svc.listTaskThemesByTop(t,'block',category); setThemePath(ts[0]?.path || t); }}/>
              <span style="margin-left:4px;">{t}</span>
            </label>
          ))}
        </div>
      </div>

      <div class="setting-item"><div class="setting-item-name">主题</div>
        <div class="setting-item-control">
          <select value={themePath} onChange={e=>setThemePath((e.target as HTMLSelectElement).value)} style="min-width:260px;">
            {svc.listTaskThemesByTop(top,'block',category).map(t=>(
              <option value={t.path}>{t.icon ? `${t.icon} ` : ''}{t.path}</option>
            ))}
          </select>
        </div>
      </div>

      {category!=='思考' && Array.isArray(fieldOptions['周期']) && (
        <div class="setting-item"><div class="setting-item-name">周期</div>
          <div class="setting-item-control">
            <select value={period} onChange={e=>setPeriod((e.target as HTMLSelectElement).value)}>
              <option value="">（无）</option>
              {fieldOptions['周期'].map((o: string)=> <option value={o}>{o}</option>)}
            </select>
          </div>
        </div>
      )}

      {category==='思考' && Array.isArray(fieldOptions['分类']) && (
        <div class="setting-item"><div class="setting-item-name">思考分类</div>
          <div class="setting-item-control">
            <select value={thoughtType} onChange={e=>setThoughtType((e.target as HTMLSelectElement).value)}>
              <option value="">（无）</option>
              {fieldOptions['分类'].map((o: string)=> <option value={o}>{o}</option>)}
            </select>
          </div>
        </div>
      )}

      <div class="setting-item"><div class="setting-item-name">日期</div>
        <div class="setting-item-control">
          <input type="date" value={dateISO} onChange={e=>setDateISO((e.target as HTMLInputElement).value)} />
        </div>
      </div>

      <div class="setting-item"><div class="setting-item-name">内容</div>
        <div class="setting-item-control">
          <textarea rows={6} placeholder="输入内容…" onInput={e=>setContent((e.target as HTMLTextAreaElement).value)} />
        </div>
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
        <button class="mod-cta" onClick={onSubmit}>提交 ↩︎</button>
        <button onClick={close}>取消</button>
      </div>
    </div>
  );
}