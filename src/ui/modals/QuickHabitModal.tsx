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

type Preset = {
  tag: string;                  // 生活/早起 之类
  starCount?: number;           // 最大评分
  displayMode?: 'image' | 'emoji';
  emojiMapping?: string[];      // 暂未用
  imageMapping?: string[];      // 暂未用
};

export class QuickHabitModal extends Modal {
  constructor(private plugin: ThinkPlugin) { super(plugin.app); }
  onOpen()  { render(<HabitForm app={this.app} plugin={this.plugin} close={()=>this.close()}/>, this.contentEl); }
  onClose() { this.contentEl.empty(); }
}

function HabitForm(
  { app, plugin, close }: { app: App; plugin: ThinkPlugin; close: () => void }
) {
  const svc = new InputService(app, plugin);

  /* ---------- 读取 presets ---------- */
  const presets: Preset[] = plugin.inputSettings?.base?.blocks?.['打卡']?.presets ?? [];
  const [presetIdx, setPresetIdx] = useState(0);
  const curPreset = presets[presetIdx] ?? { tag: '' };

  /* ---------- 大类 / 主题 ---------- */
  const initTop = (curPreset.tag || '').split('/')[0] || '生活';
  const [top, setTop] = useState<typeof initTop>(initTop);

  const buildThemes = () => svc.listBlockThemesByTop(top, '打卡');
  const [themes, setThemes] = useState(buildThemes());
  const [themePath, setThemePath] = useState(themes[0]?.path || top);
  const themeIcon = themes.find(t => t.path === themePath)?.icon ?? '';

  /* ---------- 其他字段 ---------- */
  const [dateISO, setDateISO] = useState(todayISO());
  const [content, setContent] = useState('');

  /* ---------- 评分 ---------- */
  const [score, setScore] = useState(1);
  useEffect(() => {
    const max = curPreset.starCount || 5;
    if (score > max) setScore(max);
    if (score < 1)   setScore(1);
  }, [presetIdx]);

  /* ---------- 切换预设 ---------- */
  function choosePreset(i: number) {
    setPresetIdx(i);
    const newTop = (presets[i].tag || '').split('/')[0] || '生活';
    setTop(newTop);
    const ts = svc.listBlockThemesByTop(newTop, '打卡');
    setThemes(ts);
    setThemePath(ts[0]?.path || newTop);
    setScore(1);
  }

  /* ---------- 提交 ---------- */
  async function onSubmit() {
    if (!curPreset.tag) { new Notice('请先配置打卡 presets'); return; }

    const blockText = makeBlock({
      category   : '打卡',
      dateISO    : dateISO,
      themeLabel : top,
      icon       : themeIcon,
      content    : content,
      extra      : { '评分': String(score), '预设': curPreset.tag }
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
  const max = curPreset.starCount || 5;

  return (
    <div class="think-modal">
      <h3 style="margin-bottom:1rem;">快速录入 · 打卡</h3>

      {/* 预设 */}
      <Field label="预设">
        {presets.map((p, i) => (
          <Radio
            key={i}
            value={String(i)}
            checked={presetIdx === i}
            onChange={() => choosePreset(i)}
            label={p.tag || `预设${i + 1}`}
          />
        ))}
      </Field>

      {/* 大类 */}
      <Field label="大类">
        {(['生活', '健康', '电脑', '工作', '其他'] as const).map(t => (
          <Radio
            key={t}
            value={t}
            checked={top === t}
            onChange={() => {
              setTop(t);
              const ts = svc.listBlockThemesByTop(t, '打卡');
              setThemes(ts);
              setThemePath(ts[0]?.path || t);
            }}
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
          style="min-width:140px;"
        />
      </Field>

      {/* 评分 */}
      <Field label={`评分 (1~${max})`}>
        <input
          type="number"
          min={1}
          max={max}
          value={score}
          onInput={e => setScore(Number((e.target as HTMLInputElement).value))}
          style="width:80px;"
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