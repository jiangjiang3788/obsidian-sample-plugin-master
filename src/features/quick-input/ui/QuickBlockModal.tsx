// src/features/quick-input/ui/QuickBlockModal.tsx
/** @jsxImportSource preact */
import { App, Modal, Notice } from 'obsidian';
import { h, render } from 'preact';
import { useState, useMemo, useEffect } from 'preact/hooks';
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

type BlockCategory = typeof BLOCK_NAMES.PLAN | typeof BLOCK_NAMES.REVIEW | typeof BLOCK_NAMES.THINKING;

/* ---------------- Modal ---------------- */
export class QuickBlockModal extends Modal {
  constructor(private plugin: ThinkPlugin) { super(plugin.app); }
  onOpen() { render(<Form app={this.app} close={() => this.close()} />, this.contentEl); }
  onClose() { this.contentEl.empty(); }
}

function Form({ app, close }: { app: App; close: () => void }) {
  const svc = useMemo(() => new InputService(app), [app]);
  const inputSettings = AppStore.instance.getSettings().inputSettings;

  const [cat, setCat] = useState<BlockCategory>(BLOCK_NAMES.THINKING);
 
  const topCats = useMemo(() => svc.getBlockTopCategories(cat), [svc, cat]);
  const [top, setTop] = useState(topCats[0] ?? '');

  const themes = useMemo(() => svc.listBlockThemesByTop(top, cat), [svc, top, cat]);
  const [theme, setTheme] = useState(themes[0]?.path || top);
 
  const themeIcon = useMemo(() => themes.find(t => t.path === theme)?.icon ?? '', [themes, theme]);

  /* 其他字段 */
  const { periods, types } = useMemo(() => {
    const baseBlk = inputSettings?.base?.blocks?.[cat] ?? {};
    const opts = baseBlk.fieldOptions ?? {};
    return {
      // [REFACTOR] 使用常量作为字段键
      periods: Array.isArray(opts[FIELD_KEYS.PERIOD]) ? opts[FIELD_KEYS.PERIOD] : [],
      types: Array.isArray(opts[FIELD_KEYS.CATEGORY]) ? opts[FIELD_KEYS.CATEGORY] : [],
    };
  }, [inputSettings, cat]);

  const [date, setDate] = useState(todayISO());
  const [txt, setTxt] = useState('');
  const [period, setPeriod] = useState('');
  const [type, setType] = useState('');

  // 联动逻辑
  useEffect(() => { setTop(topCats[0] ?? ''); }, [topCats]);
  useEffect(() => { setTheme(themes[0]?.path || top); }, [themes, top]);
  useEffect(() => {
    // [REFACTOR] 使用常量
    setPeriod(cat !== BLOCK_NAMES.THINKING && periods.includes('周') ? '周' : '');
    setType(cat === BLOCK_NAMES.THINKING && types.includes('思考') ? '思考' : '');
  }, [cat, periods, types]);


  async function save() {
    if (!txt.trim()) { new Notice('请填写内容'); return; }
    const extra: Record<string, string> = {};
    // [REFACTOR] 使用常量
    if (cat !== BLOCK_NAMES.THINKING && period) extra[FIELD_KEYS.PERIOD] = period;
    if (cat === BLOCK_NAMES.THINKING && type) extra[FIELD_KEYS.CATEGORY] = type;

    const block = makeBlock({
      category: cat,
      dateISO: date,
      themeLabel: top,
      icon: themeIcon,
      content: txt,
      extra
    });

    try {
      await svc.writeBlock(theme, cat, null, block);
      new Notice('✅ 已保存');
      DataStore.instance?.notifyChange?.();
      close();
    } catch (e: any) {
      new Notice('❌ 保存失败：' + (e.message ?? e));
    }
  }

  /* -------- 渲染 -------- */
  return (
    <div class="think-modal">
      <h3 style="margin-bottom:1rem;">快速录入 · {cat}</h3>
      <RadioGroup
        label="类别"
        // [REFACTOR] 使用常量
        options={([BLOCK_NAMES.PLAN, BLOCK_NAMES.REVIEW, BLOCK_NAMES.THINKING] as const).map(c => ({ value: c, label: c }))}
        selectedValue={cat}
        onChange={(c) => setCat(c as BlockCategory)}
      />
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
        selectedValue={theme}
        onChange={setTheme}
      />
     
      {/* [REFACTOR] 使用常量 */}
      {cat !== BLOCK_NAMES.THINKING && (
        <RadioGroup
          label={FIELD_KEYS.PERIOD}
          name="period"
          options={periods.map(p => ({ value: p, label: p }))}
          selectedValue={period}
          onChange={setPeriod}
        />
      )}
     
      {/* [REFACTOR] 使用常量 */}
      {cat === BLOCK_NAMES.THINKING && (
        <RadioGroup
          label={`思考${FIELD_KEYS.CATEGORY}`}
          name="type"
          options={types.map(t => ({ value: t, label: t }))}
          selectedValue={type}
          onChange={setType}
        />
      )}

      <Field label="日期">
        <input type="date" value={date}
          onChange={e => setDate((e.target as HTMLInputElement).value)}
          style="min-width:140px;" />
      </Field>
      <Field label="内容">
        <textarea rows={6} style="width:100%;" placeholder="输入内容…"
          value={txt} onInput={e => setTxt((e.target as HTMLTextAreaElement).value)} />
      </Field>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
        <button class="mod-cta" onClick={save}>提交 ↩︎</button>
        <button onClick={close}>取消</button>
      </div>
    </div>
  );
}