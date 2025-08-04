// src/ui/modals/QuickBlockModal.tsx
/** @jsxImportSource preact */
import { App, Modal, Notice } from 'obsidian';
import { h, render } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type ThinkPlugin from '../../main';
import { InputService } from '../../services/inputService';
import { makeBlock } from '../../utils/templates';

/* ---------- 工具函数 ---------- */
const todayISO = () => (window as any).moment().format('YYYY-MM-DD');

/* ===================================================================== */
/*  Modal 外壳                                                           */
/* ===================================================================== */
export class QuickBlockModal extends Modal {
  constructor(private plugin: ThinkPlugin) { super(plugin.app); }
  onOpen()  { render(<BlockForm app={this.app} plugin={this.plugin} close={() => this.close()}/>, this.contentEl); }
  onClose() { this.contentEl.empty(); }
}

/* ===================================================================== */
/*  Main 表单                                                            */
/* ===================================================================== */
function BlockForm({ app, plugin, close }: { app: App; plugin: ThinkPlugin; close: () => void }) {
  const svc = new InputService(app, plugin);

  /* ---------- 初始状态 ---------- */
  const [category, setCategory] = useState<'计划'|'总结'|'思考'>('思考');
  const [top, setTop]           = useState<'生活'|'健康'|'电脑'|'工作'|'其他'>('生活');

  /* ---------- 主题列表 ---------- */
  const themes = useMemo(
    () => svc.listBlockThemesByTop(top, category),   // ← 使用新的 API
    [svc, top, category]
  );
  const [themePath, setThemePath] = useState(themes[0]?.path || top);
  const themeIcon = themes.find(t => t.path === themePath)?.icon ?? '';

  /* ---------- 其他字段 ---------- */
  const [dateISO, setDateISO]     = useState<string>(todayISO());
  const [content, setContent]     = useState<string>('');

  const baseBlockOpt = plugin.inputSettings?.base?.blocks?.[category] ?? {};
  const fieldOptions = baseBlockOpt.fieldOptions ?? {};
  const [period, setPeriod]       = useState<string>('');   // 周期 (计划/总结)
  const [thoughtType, setType]    = useState<string>('');   // 分类 (思考)

  /* ---------- 提交 ---------- */
  const onSubmit = async () => {
    if (!content.trim()) { new Notice('请填写内容'); return; }

    const extra: Record<string,string> = {};
    if ((category === '计划' || category === '总结') && period) extra['周期'] = period;
    if (category === '思考' && thoughtType)                     extra['分类'] = thoughtType;

    const blockText = makeBlock({
      category,
      dateISO,
      themeLabel : top,          // 主题:: 生活 / 健康 等
      icon       : themeIcon,
      content,
      tags       : [themePath],  // 标签:: 生活/娱乐 之类
      extra
    });

    try {
      await svc.writeBlock(themePath, category, null, blockText);
      new Notice('已保存');
      plugin.dataStore?.notifyChange?.();
      close();
    } catch (e:any) {
      new Notice('保存失败：' + (e.message ?? e));
    }
  };

  /* ---------- 渲染 ---------- */
  return (
    <div class="think-modal">
      <h3>快速录入 · {category}</h3>

      {/* --- 类别 --- */}
      <Item label="类别">
        {(['计划','总结','思考'] as const).map(c => (
          <Radio
            key={c}
            checked={category === c}
            onChange={() => setCategory(c)}
            label={c}
          />
        ))}
      </Item>

      {/* --- 大类 --- */}
      <Item label="大类">
        {(['生活','健康','电脑','工作','其他'] as const).map(t => (
          <Radio
            key={t}
            checked={top === t}
            onChange={() => {
              setTop(t);
              const ts = svc.listBlockThemesByTop(t, category);
              setThemePath(ts[0]?.path || t);
            }}
            label={t}
          />
        ))}
      </Item>

      {/* --- 主题 --- */}
      <Item label="主题">
        <select
          style="min-width:260px;"
          value={themePath}
          onChange={e => setThemePath((e.target as HTMLSelectElement).value)}
        >
          {svc.listBlockThemesByTop(top, category).map(t => (
            <option value={t.path}>
              {t.icon ? `${t.icon} ` : ''}{t.path}
            </option>
          ))}
        </select>
      </Item>

      {/* --- 周期 / 分类 --- */}
      { (category !== '思考') && Array.isArray(fieldOptions['周期']) && (
        <Item label="周期">
          <select value={period} onChange={e => setPeriod((e.target as HTMLSelectElement).value)}>
            <option value="">（无）</option>
            {fieldOptions['周期'].map((o:string) => <option value={o}>{o}</option>)}
          </select>
        </Item>
      )}

      { (category === '思考') && Array.isArray(fieldOptions['分类']) && (
        <Item label="思考分类">
          <select value={thoughtType} onChange={e => setType((e.target as HTMLSelectElement).value)}>
            <option value="">（无）</option>
            {fieldOptions['分类'].map((o:string) => <option value={o}>{o}</option>)}
          </select>
        </Item>
      )}

      {/* --- 日期 --- */}
      <Item label="日期">
        <input type="date" value={dateISO} onChange={e => setDateISO((e.target as HTMLInputElement).value)} />
      </Item>

      {/* --- 内容 --- */}
      <Item label="内容">
        <textarea
          rows={6}
          placeholder="输入内容…"
          value={content}
          onInput={e => setContent((e.target as HTMLTextAreaElement).value)}
        />
      </Item>

      {/* --- 按钮 --- */}
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
        <button class="mod-cta" onClick={onSubmit}>提交 ↩︎</button>
        <button onClick={close}>取消</button>
      </div>
    </div>
  );
}

/* ===================================================================== */
/*  小组件                                                               */
/* ===================================================================== */
function Item({ label, children }: { label: string; children: any }) {
  return (
    <div class="setting-item">
      <div class="setting-item-name" style="min-width:72px;">{label}</div>
      <div class="setting-item-control">{children}</div>
    </div>
  );
}

function Radio(
  { checked, onChange, label }: { checked: boolean; onChange: ()=>void; label: string }
) {
  return (
    <label style="margin-right:10px;cursor:pointer;">
      <input type="radio" checked={checked} onChange={onChange} />
      <span style="margin-left:4px;">{label}</span>
    </label>
  );
}