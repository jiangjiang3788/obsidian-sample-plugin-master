// src/ui/modals/QuickHabitModal.tsx
/** @jsxImportSource preact */
import { App, Modal, Notice } from 'obsidian';
import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type ThinkPlugin from '../../main';
import { InputService } from '../../services/inputService';
import { makeBlock } from '../../utils/templates';

/* ---------- 工具 ---------- */
const todayISO = () => (window as any).moment().format('YYYY-MM-DD');
const lastSeg  = (p: string) => p.split('/').pop() ?? p;
const INPUT_W  = '140px';                        // 日期 & 评分统一宽度

export class QuickHabitModal extends Modal {
  constructor(private plugin: ThinkPlugin) { super(plugin.app); }
  onOpen()  { render(<HabitForm app={this.app} plugin={this.plugin} close={() => this.close()}/>, this.contentEl); }
  onClose() { this.contentEl.empty(); }
}

function HabitForm(
  { app, plugin, close }: { app: App; plugin: ThinkPlugin; close: () => void }
) {
  const svc = new InputService(app, plugin);

  /* ---------- 顶级分类 ---------- */
  const topCats = svc.getBlockTopCategories('打卡');
  const [top, setTop] = useState(topCats[0] ?? '');

  /* ---------- 主题列表 ---------- */
  const buildThemes = () => svc.listBlockThemesByTop(top, '打卡');
  const [themes, setThemes] = useState(buildThemes());
  const [themePath, setThemePath] = useState(themes[0]?.path || top);
  const themeIcon = themes.find(t => t.path === themePath)?.icon ?? '';

  /* ---------- 动态读取 starCount ---------- */
  function getStarMax(path: string): number {
    const th = (plugin.inputSettings?.themes || []).find((t: any) => t.path === path);
    const blk = th?.blocks?.['打卡'] || {};
    if (typeof blk.starCount === 'number') return blk.starCount;
    if (Array.isArray(blk.emojiMapping))  return blk.emojiMapping.length;
    if (Array.isArray(blk.imageMapping))  return blk.imageMapping.length;
    return 5;                              // 默认
  }

  const [starMax, setStarMax] = useState(getStarMax(themePath));

  /* ---------- 其他字段 ---------- */
  const [dateISO, setDateISO] = useState(todayISO());
  const [content, setContent] = useState('');
  const [score,   setScore]   = useState(1);

  /* ---------- 主题变化时同步评分上限 ---------- */
  useEffect(() => {
    const mx = getStarMax(themePath);
    setStarMax(mx);
    if (score > mx) setScore(mx);
  }, [themePath]);

  /* ---------- 切换大类 ---------- */
  function chooseTop(t: string) {
    setTop(t);
    const ts = svc.listBlockThemesByTop(t, '打卡');
    setThemes(ts);
    setThemePath(ts[0]?.path || t);
  }

  /* ---------- 提交 ---------- */
  async function onSubmit() {
    if (!content.trim()) { new Notice('请填写内容'); return; }

    const blockText = makeBlock({
      category   : '打卡',
      dateISO    : dateISO,
      themeLabel : top,
      icon       : themeIcon,
      content    : content,
      extra      : { '评分': String(score) }        // 仅评分
    });

    try {
      await svc.writeBlock(themePath, '打卡', null, blockText);
      new Notice('✅ 已保存打卡');
      plugin.dataStore?.notifyChange?.();
      close();
    } catch (e:any) {
      new Notice('❌ 保存失败：' + (e.message ?? e));
    }
  }

  /* ---------- 渲染 ---------- */
  return (
    <div class="think-modal">
      <h3 style="margin-bottom:1rem;">快速录入 · 打卡</h3>

      {/* 大类 */}
      <Field label="大类">
        {topCats.map(t => (
          <Radio
            key={t}
            value={t}
            checked={top === t}
            onChange={() => chooseTop(t)}
            label={t}
          />
        ))}
      </Field>

      {/* 主题 */}
      <Field label="主题">
        {themes.map(t => (
          <Radio
            key={t.path}
            name="theme"
            value={t.path}
            checked={themePath === t.path}
            onChange={() => setThemePath(t.path)}
            label={lastSeg(t.path)}
          />
        ))}
      </Field>

      {/* 日期 */}
      <Field label="日期">
        <input
          type="date"
          value={dateISO}
          onChange={e => setDateISO((e.target as HTMLInputElement).value)}
          style={{ width: INPUT_W }}
        />
      </Field>

      {/* 评分 */}
      <Field label={`评分 (1~${starMax})`}>
        <input
          type="number"
          min={1}
          max={starMax}
          value={score}
          onInput={e => setScore(Number((e.target as HTMLInputElement).value))}
          style={{ width: INPUT_W }}
        />
      </Field>

      {/* 内容 */}
      <Field label="内容">
        <textarea
          rows={5}
          placeholder="备注…"
          style="width:100%;"
          value={content}
          onInput={e => setContent((e.target as HTMLTextAreaElement).value)}
        />
      </Field>

      {/* 按钮 */}
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
function Field({ label, children }: { label: string; children: any }) {
  return (
    <div style="margin-bottom:12px;">
      <div style="margin-bottom:4px;font-weight:600;">{label}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">{children}</div>
    </div>
  );
}

function Radio(
  { value, checked, onChange, label, name }:
  { value: string; checked: boolean; onChange: () => void; label?: string; name?: string }
) {
  return (
    <label style="display:flex;align-items:center;gap:4px;cursor:pointer;">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        style="appearance:radio;-webkit-appearance:radio;"
      />
      <span>{label ?? value}</span>
    </label>
  );
}