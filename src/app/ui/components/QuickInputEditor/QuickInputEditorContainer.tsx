/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';

import { selectInputSettings, useSelector } from '@/app/public';
import type { ThemeDefinition } from '@core/public';
import { dayjs, getEffectiveTemplate, renderTemplate, getLeafPath } from '@core/public';
import { computeLinkedTimeChanges, finalizeLinkedTimeFields } from '@shared/public';

import { QuickInputEditorView } from './QuickInputEditorView';

// 稳定空引用：避免调用方传入 `initialFormData={{}}` 造成死循环。
const EMPTY_FORM_DATA: Record<string, any> = {};

type TimeDirection = 'forward' | 'backward';

/**
 * 计划第 8 步（基础版）：字段值来源分层
 * - user:            用户手动输入
 * - context:         来自外部上下文 / 编辑态回填
 * - template_default:模板默认值（可能依赖主题渲染）
 * - system_auto:     系统自动值（今天日期/当前时间/首个选项/联动推导）
 *
 * 主题切换时：
 * - 保留 user/context
 * - 允许刷新 template_default/system_auto
 */
export type QuickInputFieldSource = 'user' | 'context' | 'template_default' | 'system_auto';
export type QuickInputFieldSourceMap = Record<string, QuickInputFieldSource>;

/** 将“时间/结束/时长”字段收敛成最终数据，并去掉编辑态元字段。 */
export function finalizeQuickInputFormData(formData: Record<string, any>) {
  const finalData = { ...formData };
  const direction = finalData.__timeDirection === 'backward' ? 'backward' : 'forward';
  delete finalData.lastChanged;
  delete finalData.__timeDirection;
  return finalizeLinkedTimeFields(finalData, { startKey: '时间', endKey: '结束', durationKey: '时长' }, { durationOutput: 'number', direction });
}

export interface QuickInputEditorState {
  blockId: string;
  themeId: string | null;
  formData: Record<string, any>;
  template: any;
  theme: ThemeDefinition | null;
  templateId: string | null;
  templateSourceType: 'block' | 'override' | null;
  fieldSources?: QuickInputFieldSourceMap;
  /** 完整路径主题，例如：学习/英语/听力。 */
  themePath?: string | null;
  /** 根主题，例如：学习。 */
  rootTheme?: string | null;
  /** 叶主题，例如：听力。 */
  leafTheme?: string | null;
  fieldSourceSummary?: Record<QuickInputFieldSource, number>;
}

export interface QuickInputEditorProps {
  /** 用于渲染 rating 图片资源（由 platform 注入）。 */
  getResourcePath: (path: string) => string;
  initialBlockId: string;
  context?: Record<string, any>;
  initialThemeId?: string | null;
  initialFormData?: Record<string, any>;
  allowBlockSwitch?: boolean;
  dense?: boolean;
  showDivider?: boolean;
  onStateChange?: (state: QuickInputEditorState) => void;
  onRequestSubmit?: () => void;
  isMobileLike?: boolean;
}

const isMeaningfulValue = (value: any) => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value !== '';
  return true;
};

const isOptionLike = (value: any) => !!value && typeof value === 'object' && 'value' in value && 'label' in value;

const isSameValue = (a: any, b: any) => {
  if (isOptionLike(a) && isOptionLike(b)) {
    return a.value === b.value && a.label === b.label;
  }
  return a === b;
};

const isRefreshableSource = (source?: QuickInputFieldSource) => source === undefined || source === 'template_default' || source === 'system_auto';

const buildInitialFieldSources = (initialData?: Record<string, any>): QuickInputFieldSourceMap => {
  const next: QuickInputFieldSourceMap = {};
  if (!initialData) return next;
  Object.keys(initialData).forEach((key) => {
    if (key === '__timeDirection' || key === 'lastChanged') return;
    if (!isMeaningfulValue(initialData[key])) return;
    next[key] = 'context';
  });
  return next;
};

const splitThemePathParts = (path?: string | null) => {
  const parts = String(path || '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    themePath: parts.length ? parts.join('/') : null,
    rootTheme: parts[0] || null,
    leafTheme: parts.length ? parts[parts.length - 1] : null,
  };
};

const buildFieldSourceSummary = (sources: QuickInputFieldSourceMap): Record<QuickInputFieldSource, number> => ({
  user: Object.values(sources).filter((v) => v === 'user').length,
  context: Object.values(sources).filter((v) => v === 'context').length,
  template_default: Object.values(sources).filter((v) => v === 'template_default').length,
  system_auto: Object.values(sources).filter((v) => v === 'system_auto').length,
});

/**
 * QuickInputEditor（Container）
 * - 状态/订阅/副作用在这里
 * - 纯渲染交给 QuickInputEditorView
 */
export function QuickInputEditor({
  getResourcePath,
  initialBlockId,
  context,
  initialThemeId = null,
  initialFormData,
  allowBlockSwitch = true,
  dense = false,
  showDivider = true,
  onStateChange,
  onRequestSubmit,
  isMobileLike = false,
}: QuickInputEditorProps) {
  const settings = useSelector(selectInputSettings);

  const [currentBlockId, setCurrentBlockId] = useState(initialBlockId);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(initialThemeId);
  const [formData, setFormData] = useState<Record<string, any>>(() => initialFormData ?? EMPTY_FORM_DATA);
  const [fieldSources, setFieldSources] = useState<QuickInputFieldSourceMap>(() => buildInitialFieldSources(initialFormData));
  const [timeDirection, setTimeDirection] = useState<TimeDirection>(() => (initialFormData?.__timeDirection === 'backward' ? 'backward' : 'forward'));

  useEffect(() => setCurrentBlockId(initialBlockId), [initialBlockId]);
  useEffect(() => setSelectedThemeId(initialThemeId ?? null), [initialThemeId]);
  // 不要依赖 initialFormData（可能是新对象）→ 用 block/theme 变化作为 reset 语义。
  useEffect(() => {
    setFormData(initialFormData ?? EMPTY_FORM_DATA);
    setFieldSources(buildInitialFieldSources(initialFormData));
    setTimeDirection(initialFormData?.__timeDirection === 'backward' ? 'backward' : 'forward');
  }, [initialBlockId, initialThemeId]);

  const blocks = useMemo(() => settings.blocks || [], [settings.blocks]);
  const themes = useMemo(() => settings.themes || [], [settings.themes]);

  const { availableThemes, themeIdMap, pathToIdMap } = useMemo(() => {
    const disabledThemeIds = new Set<string>();
    (settings.overrides || []).forEach((override: any) => {
      if (override.blockId === currentBlockId && override.disabled) disabledThemeIds.add(override.themeId);
    });

    const availableThemes = (themes || []).filter((t: any) => !disabledThemeIds.has(t.id));
    return {
      availableThemes,
      themeIdMap: new Map<string, ThemeDefinition>((themes || []).map((t: any) => [t.id, t])),
      pathToIdMap: new Map<string, string>((themes || []).map((t: any) => [t.path, t.id])),
    };
  }, [settings, themes, currentBlockId]);

  const { template, theme, templateId, templateSourceType } = useMemo(() => getEffectiveTemplate(settings, currentBlockId, selectedThemeId || undefined), [
    settings,
    currentBlockId,
    selectedThemeId,
  ]);

  const showTimeDirectionControl = useMemo(() => {
    if (!template?.fields) return false;
    const keys = new Set((template.fields || []).map((f: any) => f.key || f.label));
    return keys.has('时间') && keys.has('结束') && keys.has('时长');
  }, [template]);

  const applyLinkedDraftChanges = (draft: Record<string, any>, direction: TimeDirection = timeDirection) => {
    const changes = computeLinkedTimeChanges(draft, { startKey: '时间', endKey: '结束', durationKey: '时长' }, (draft as any).lastChanged, {
      durationOutput: 'number',
      direction,
    });
    if (!Object.keys(changes).length) {
      const cleaned = { ...draft };
      if ('lastChanged' in cleaned) delete cleaned.lastChanged;
      return { formData: cleaned, autoKeys: [] as string[] };
    }
    const merged = { ...draft, ...changes };
    if ('lastChanged' in merged) delete merged.lastChanged;
    return { formData: merged, autoKeys: Object.keys(changes) };
  };

  // 默认值/从 context 回填
  useEffect(() => {
    if (!template) return;

    const dataForParsing = { ...context, theme: theme ? { path: theme.path, icon: theme.icon || '' } : {} };

    setFormData((current) => {
      let changed = false;
      const next: Record<string, any> = { ...current };
      const nextSources: QuickInputFieldSourceMap = { ...fieldSources };

      const assignValue = (key: string, value: any, source: QuickInputFieldSource) => {
        if (!isSameValue(next[key], value)) {
          next[key] = value;
          changed = true;
        }
        if (nextSources[key] !== source) {
          nextSources[key] = source;
          changed = true;
        }
      };

      template.fields.forEach((field: any) => {
        const key = field.key;
        const existingValue = next[key];
        const existingSource = nextSources[key];
        const hasMeaningfulExisting = isMeaningfulValue(existingValue);
        const canRefresh = !hasMeaningfulExisting || isRefreshableSource(existingSource);

        const contextValue = context?.[field.key] ?? context?.[field.label];
        if (contextValue !== undefined) {
          if (!hasMeaningfulExisting || existingSource !== 'user') {
            if (['select', 'radio', 'rating'].includes(field.type)) {
              const rawString = contextValue !== null && contextValue !== undefined ? String(contextValue) : '';
              const leafString = getLeafPath(rawString) || rawString;
              const matched = (field.options || []).find((opt: any) => {
                const optLabel = String(opt.label || opt.value || '');
                const optValue = String(opt.value || '');
                return optValue === rawString || optLabel === rawString || optLabel === leafString || String(optLabel) === String(rawString);
              });
              assignValue(key, matched ? { value: matched.value, label: matched.label || matched.value } : contextValue, 'context');
            } else {
              assignValue(key, contextValue, 'context');
            }
          }
          return;
        }

        if (!canRefresh) return;

        const isSelectable = ['select', 'radio', 'rating'].includes(field.type);
        if (field.defaultValue) {
          if (isSelectable) {
            const findOption = (val: string | undefined) => (field.options || []).find((o: any) => o.label === val || o.value === val);
            let opt = findOption(field.defaultValue as string);
            if (!opt && field.options?.length) opt = field.options[0];
            if (opt) assignValue(key, { value: opt.value, label: opt.label || opt.value }, 'template_default');
          } else {
            let v = field.defaultValue || '';
            if (typeof v === 'string') v = renderTemplate(v, dataForParsing);
            assignValue(key, v, 'template_default');
          }
        } else if (!hasMeaningfulExisting || existingSource === undefined || existingSource === 'system_auto') {
          if (field.type === 'date') assignValue(key, dayjs().format('YYYY-MM-DD'), 'system_auto');
          else if (field.type === 'time') assignValue(key, dayjs().format('HH:mm'), 'system_auto');
          else if (isSelectable && field.options?.length) {
            const first = field.options[0];
            assignValue(key, { value: first.value, label: first.label || first.value }, 'system_auto');
          }
        }
      });

      if (!changed) return current;

      const finalized = finalizeLinkedTimeFields(next, { startKey: '时间', endKey: '结束', durationKey: '时长' }, { durationOutput: 'number', direction: timeDirection });
      const autoComputedKeys: string[] = [];
      if (finalized['时间'] !== next['时间']) autoComputedKeys.push('时间');
      if (finalized['结束'] !== next['结束']) autoComputedKeys.push('结束');
      if (finalized['时长'] !== next['时长']) autoComputedKeys.push('时长');
      autoComputedKeys.forEach((key) => {
        next[key] = finalized[key];
        nextSources[key] = 'system_auto';
      });

      setFieldSources(nextSources);
      return next;
    });
  }, [template, theme, context, timeDirection]);

  useEffect(() => {
    const currentTheme = selectedThemeId ? themeIdMap.get(selectedThemeId) ?? null : null;
    const themeParts = splitThemePathParts(currentTheme?.path ?? null);
    onStateChange?.({
      blockId: currentBlockId,
      themeId: selectedThemeId,
      formData: { ...formData, __timeDirection: timeDirection },
      template,
      theme: currentTheme,
      templateId,
      templateSourceType,
      fieldSources,
      ...themeParts,
      fieldSourceSummary: buildFieldSourceSummary(fieldSources),
    });
  }, [currentBlockId, selectedThemeId, formData, timeDirection, template, templateId, templateSourceType, fieldSources]);

  const emitDraftState = (draftFormData: Record<string, any>, directionOverride: TimeDirection = timeDirection, sourceOverride: QuickInputFieldSourceMap = fieldSources) => {
    const currentTheme = selectedThemeId ? themeIdMap.get(selectedThemeId) ?? null : null;
    const themeParts = splitThemePathParts(currentTheme?.path ?? null);
    onStateChange?.({
      blockId: currentBlockId,
      themeId: selectedThemeId,
      formData: { ...draftFormData, __timeDirection: directionOverride },
      template,
      theme: currentTheme,
      templateId,
      templateSourceType,
      fieldSources: sourceOverride,
      ...themeParts,
      fieldSourceSummary: buildFieldSourceSummary(sourceOverride),
    });
  };

  const handleUpdateField = (key: string, value: any, isOptionObject = false) => {
    setFormData((cur) => {
      const draft = { ...cur, [key]: isOptionObject ? { value: value.value, label: value.label } : value, lastChanged: key };
      const linked = applyLinkedDraftChanges(draft, timeDirection);
      setFieldSources((prev) => {
        const nextSources = { ...prev, [key]: 'user' as QuickInputFieldSource };
        linked.autoKeys.forEach((autoKey) => {
          if (autoKey !== key) nextSources[autoKey] = 'system_auto';
        });
        emitDraftState(linked.formData, timeDirection, nextSources);
        return nextSources;
      });
      return linked.formData;
    });
  };

  const handleTimeDirectionChange = (nextDirection: TimeDirection) => {
    setTimeDirection(nextDirection);
    setFormData((cur) => {
      const draft = { ...cur };
      if (nextDirection === 'backward' && !draft['结束']) {
        draft['结束'] = dayjs().format('HH:mm');
      }
      const linked = applyLinkedDraftChanges(draft, nextDirection);
      setFieldSources((prev) => {
        const nextSources = { ...prev };
        if (nextDirection === 'backward' && !prev['结束'] && draft['结束']) nextSources['结束'] = 'system_auto';
        linked.autoKeys.forEach((autoKey) => {
          nextSources[autoKey] = 'system_auto';
        });
        emitDraftState(linked.formData, nextDirection, nextSources);
        return nextSources;
      });
      return linked.formData;
    });
  };

  const handleBlockChange = (newBlockId: string) => {
    if (newBlockId === currentBlockId) return;
    const preserved: Record<string, any> = {};
    const preservedSources: QuickInputFieldSourceMap = {};
    ['内容', 'content', '日期', 'date', '时间', 'time', '备注', 'note', 'description'].forEach((k) => {
      if (formData[k] !== undefined) preserved[k] = formData[k];
      if (fieldSources[k]) preservedSources[k] = fieldSources[k];
    });
    setCurrentBlockId(newBlockId);
    setFormData(preserved);
    setFieldSources(preservedSources);
    setTimeDirection('forward');
  };

  const handleSelectTheme = (themeId: string | null, path: string | null) => {
    // 清空
    if (!themeId || !path) {
      setSelectedThemeId(null);
      return;
    }

    // 兼容旧交互：重复点击同一主题 → 回到父主题
    if (selectedThemeId === themeId) {
      const parentPath = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
      const parentThemeId = parentPath ? pathToIdMap.get(parentPath) ?? null : null;
      setSelectedThemeId(parentThemeId);
      return;
    }

    setSelectedThemeId(themeId);
  };

  return (
    <QuickInputEditorView
      getResourcePath={getResourcePath}
      blocks={blocks}
      allowBlockSwitch={allowBlockSwitch}
      currentBlockId={currentBlockId}
      onBlockChange={handleBlockChange}
      themes={availableThemes}
      selectedThemeId={selectedThemeId}
      onSelectTheme={handleSelectTheme}
      template={template}
      formData={formData}
      timeDirection={timeDirection}
      dense={dense}
      showDivider={showDivider}
      onUpdateField={handleUpdateField}
      onTimeDirectionChange={handleTimeDirectionChange}
      onRequestSubmit={onRequestSubmit}
      isMobileLike={isMobileLike}
      showTimeDirectionControl={showTimeDirectionControl}
      currentThemePath={theme?.path ?? null}
      templateSourceType={templateSourceType}
      fieldSourceSummary={buildFieldSourceSummary(fieldSources)}
    />
  );
}
