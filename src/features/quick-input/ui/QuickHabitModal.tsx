// src/features/quick-input/ui/QuickHabitModal.tsx
/** @jsxImportSource preact */
import { App, Modal, Notice } from 'obsidian';
import { h, render } from 'preact';
import { useState, useEffect, useMemo } from 'preact/hooks';
import type ThinkPlugin from '../../../main';
import { InputService } from '@core/services/inputService';
import { makeBlock } from '@core/utils/templates';
import { todayISO } from '@core/utils/date';
import { Field } from '@shared/components/FieldRadio';
import { AppStore } from '@state/AppStore';
import { DataStore } from '@core/services/dataStore';
import { RadioGroup } from '@shared/components';
// [REFACTOR] 导入常量
import { BLOCK_NAMES, FIELD_KEYS } from '@core/domain/constants';

const lastSeg = (p: string) => p.split('/').pop() ?? p;

/* ---------------- Modal ---------------- */
export class QuickHabitModal extends Modal {
  constructor(private plugin: ThinkPlugin) { super(plugin.app); }
  onOpen() { render(<HabitForm app={this.app} close={() => this.close()} />, this.contentEl); }
  onClose() { this.contentEl.empty(); }
}

function HabitForm({ app, close }: { app: App; close: () => void }) {
  const svc = useMemo(() => new InputService(app), [app]);
  const inputSettings = AppStore.instance.getSettings().inputSettings;

  // [REFACTOR] 使用常量
  const topCats = useMemo(() => svc.getBlockTopCategories(BLOCK_NAMES.HABIT), [svc]);
  const [top, setTop] = useState(topCats[0] ?? '');

  // [REFACTOR] 使用常量
  const themes = useMemo(() => svc.listBlockThemesByTop(top, BLOCK_NAMES.HABIT), [svc, top]);
  const [themePath, setThemePath] = useState(themes[0]?.path || top);
 
  useEffect(() => { setTop(topCats[0] ?? ''); }, [topCats]);
  useEffect(() => { setThemePath(themes[0]?.path || top); }, [themes, top]);
 
  const starMax = useMemo(() => {
    const th = (inputSettings?.themes || []).find((t: any) => t.path === themePath);
    // [REFACTOR] 使用常量
    const blk = th?.blocks?.[BLOCK_NAMES.HABIT] || {};
    if (typeof blk.starCount === 'number') return blk.starCount;
    if (Array.isArray(blk.emojiMapping)) return blk.emojiMapping.length;
    if (Array.isArray(blk.imageMapping)) return blk.imageMapping.length;
    return 5;
  }, [themePath, inputSettings]);

  const [dateISO, setDateISO] = useState(todayISO());
  const [content, setContent] = useState('');
  const [score, setScore] = useState(1);

  useEffect(() => {
    if (score > starMax) setScore(starMax);
  }, [starMax, score]);

  async function onSubmit() {
    if (!content.trim()) { new Notice('请填写内容'); return; }

    const block = makeBlock({
      // [REFACTOR] 使用常量
      category: BLOCK_NAMES.HABIT,
      dateISO,
      themeLabel: top,
      content,
      extra: { [FIELD_KEYS.RATING]: String(score) }
    });

    try {
      // [REFACTOR] 使用常量
      await svc.writeBlock(themePath, BLOCK_NAMES.HABIT, null, block);
      new Notice('✅ 已保存打卡');
      DataStore.instance?.notifyChange?.();
      close();
    } catch (e: any) {
      new Notice('❌ 保存失败：' + (e.message ?? e));
    }
  }

  /* -------- 渲染 -------- */
  return (
    <div class="think-modal">
      <h3 style="margin-bottom:1rem;">快速录入 · {BLOCK_NAMES.HABIT}</h3>
      <RadioGroup
        label="大类"
        options={topCats.map(t => ({ value: t, label: t }))}
        selectedValue={top}
        onChange={setTop}
      />
      <RadioGroup
        label="主题"
        name="theme"
        options={themes.map(t => ({ value: t.path, label: lastSeg(t.path), icon: t.icon }))}
        selectedValue={themePath}
        onChange={setThemePath}
      />
     
      <Field label="日期">
        <input type="date" value={dateISO} onChange={e => setDateISO((e.target as HTMLInputElement).value)}
          style={{ width: '100%' }} />
      </Field>
      <Field label={`${FIELD_KEYS.RATING} (1~${starMax})`}>
        <input type="number" min={1} max={starMax} value={score}
          onInput={e => setScore(Math.max(1, Math.min(starMax, Number((e.target as HTMLInputElement).value))))}
          style={{ width: '100%' }} />
      </Field>
      <Field label="内容">
        <textarea rows={5} placeholder="备注…" style={{ width: '100%' }}
          value={content} onInput={e => setContent((e.target as HTMLTextAreaElement).value)} />
      </Field>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
        <button class="mod-cta" onClick={onSubmit}>提交 ↩︎</button>
        <button onClick={close}>取消</button>
      </div>
    </div>
  );
}