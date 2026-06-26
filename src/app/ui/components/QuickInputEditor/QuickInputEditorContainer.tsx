/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';

import { selectSettings, useSelector, useUseCases } from '@/app/public';
import type { GoalDefinition, RecordInputMeta, ThemeDefinition } from '@core/public';
import { GoalTemplateResolver, dayjs, getEffectiveCoreBlocks, getGoalTemplateVariants, getGoalTemplates, resolveDerivedPeriod, resolveTemplatePeriodPolicy, getLeafPath, getTemplateFieldSemantic, renderTemplate, splitGoalPath } from '@core/public';
import { computeLinkedTimeChanges, finalizeLinkedTimeFields } from '@shared/public';

import { QuickInputEditorView } from './QuickInputEditorView';
import type { GoalSelectorOption } from './components/GoalSelector';

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
export type QuickInputFieldSource = 'user' | 'context' | 'edit_backfill' | 'invocation_context' | 'goal_context' | 'theme_context' | 'template_default' | 'system_auto';
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
  coreBlockId?: string | null;
  goalId?: string | null;
  goalPath?: string | null;
  goalTitle?: string | null;
  rootGoal?: string | null;
  leafGoal?: string | null;
  cycleId?: string | null;
  themeId: string | null;
  formData: Record<string, any>;
  template: any;
  theme: ThemeDefinition | null;
  templateId: string | null;
  templateVariantId?: string | null;
  templateSourceType: 'core-block' | 'goal-template' | null;
  fieldSources?: QuickInputFieldSourceMap;
  meta?: RecordInputMeta;
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

const isRefreshableSource = (source?: QuickInputFieldSource) => source === undefined || source === 'template_default' || source === 'system_auto' || source === 'goal_context' || source === 'theme_context';

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


function cleanDisplaySegment(value: unknown): string {
  return String(value ?? '').replace(/^[#＃]+\s*/, '').trim();
}

function cleanDisplayPath(value?: string | null): string | null {
  const normalized = splitGoalPath(value).goalPath;
  if (!normalized) return null;
  const parts = normalized.split('/').map(cleanDisplaySegment).filter(Boolean);
  return parts.length ? parts.join('/') : null;
}

function getOrderedGoalIndex(goal: GoalDefinition | null, originalIndex: Map<string, number>): number {
  if (!goal) return Number.MAX_SAFE_INTEGER;
  const order = Number((goal as any).sortOrder);
  return Number.isFinite(order) ? order : originalIndex.get(goal.id) ?? Number.MAX_SAFE_INTEGER;
}

function getGoalByDisplayPath(goals: GoalDefinition[], path: string): GoalDefinition | null {
  return goals.find((goal) => getGoalPath(goal) === path) || null;
}

function sortGoalsLikePresetMatrix(goals: GoalDefinition[]): GoalDefinition[] {
  const originalIndex = new Map(goals.map((goal, index) => [goal.id, index]));
  return [...goals].sort((left, right) => {
    const leftParts = (getGoalPath(left) || '').split('/').filter(Boolean);
    const rightParts = (getGoalPath(right) || '').split('/').filter(Boolean);
    const max = Math.min(leftParts.length, rightParts.length);
    for (let index = 0; index < max; index += 1) {
      if (leftParts[index] === rightParts[index]) continue;
      const leftSiblingPath = [...leftParts.slice(0, index), leftParts[index]].join('/');
      const rightSiblingPath = [...rightParts.slice(0, index), rightParts[index]].join('/');
      const leftSiblingGoal = getGoalByDisplayPath(goals, leftSiblingPath);
      const rightSiblingGoal = getGoalByDisplayPath(goals, rightSiblingPath);
      const leftOrder = getOrderedGoalIndex(leftSiblingGoal, originalIndex);
      const rightOrder = getOrderedGoalIndex(rightSiblingGoal, originalIndex);
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return leftParts[index].localeCompare(rightParts[index], 'zh-CN');
    }
    if (leftParts.length !== rightParts.length) return leftParts.length - rightParts.length;
    const byOrder = getOrderedGoalIndex(left, originalIndex) - getOrderedGoalIndex(right, originalIndex);
    if (byOrder !== 0) return byOrder;
    return (originalIndex.get(left.id) ?? 0) - (originalIndex.get(right.id) ?? 0);
  });
}

function resolveQuickInputCoreBlockId(_fullSettings: any, blockId: string): string {
  return String(blockId || '');
}

function goalHasDirectEnabledPreset(fullSettings: any, goal: GoalDefinition, coreBlockId: string): boolean {
  if (!goal?.id || !coreBlockId) return false;
  return getGoalTemplates(fullSettings.goalSettings)
    .some((template) => template.enabled !== false && template.goalId === goal.id && template.coreBlockId === coreBlockId);
}

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


const splitPathParts = (path?: string | null) => {
  const parts = String(path || '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
  return { path: parts.length ? parts.join('/') : null, root: parts[0] || null, leaf: parts.length ? parts[parts.length - 1] : null };
};

function getGoalPath(goal?: GoalDefinition | null): string | null {
  if (!goal) return null;
  return cleanDisplayPath(goal.goalPath || goal.title);
}

function makeGoalIdFromPath(path: string): string {
  return `goal:${path}`;
}

function themeOptions(themes: ThemeDefinition[]) {
  return (themes || []).map((theme) => ({ value: theme.path, label: cleanDisplaySegment(theme.path.split('/').filter(Boolean).pop() || theme.path), icon: theme.icon }));
}

const buildFieldSourceSummary = (sources: QuickInputFieldSourceMap): Record<QuickInputFieldSource, number> => ({
  user: Object.values(sources).filter((v) => v === 'user').length,
  context: Object.values(sources).filter((v) => v === 'context').length,
  edit_backfill: Object.values(sources).filter((v) => v === 'edit_backfill').length,
  invocation_context: Object.values(sources).filter((v) => v === 'invocation_context').length,
  goal_context: Object.values(sources).filter((v) => v === 'goal_context').length,
  theme_context: Object.values(sources).filter((v) => v === 'theme_context').length,
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
  const fullSettings = useSelector(selectSettings);
  const settings = fullSettings.inputSettings;
  const useCases = useUseCases();

  const [currentBlockId, setCurrentBlockId] = useState(initialBlockId);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(initialThemeId);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(() => String(initialFormData?.goalId ?? initialFormData?.['目标ID'] ?? context?.goalId ?? context?.['目标ID'] ?? context?.__goalContext?.goalId ?? '').trim() || null);
  const [selectedGoalPath, setSelectedGoalPath] = useState<string | null>(() => cleanDisplayPath(String(initialFormData?.goalPath ?? initialFormData?.['目标'] ?? context?.goalPath ?? context?.['目标'] ?? context?.__goalContext?.goalPath ?? '')));
  const [selectedTemplateVariantId, setSelectedTemplateVariantId] = useState<string | null>(() => String(initialFormData?.templateVariantId ?? initialFormData?.goalTemplateVariantId ?? initialFormData?.goalTemplateId ?? initialFormData?.templateId ?? context?.templateVariantId ?? context?.goalTemplateVariantId ?? context?.goalTemplateId ?? context?.templateId ?? context?.__goalContext?.templateVariantId ?? context?.__goalContext?.goalTemplateId ?? context?.__goalContext?.templateId ?? '').trim() || null);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(() => String(initialFormData?.cycleId ?? initialFormData?.['周期ID'] ?? context?.cycleId ?? context?.['周期ID'] ?? context?.__goalContext?.cycleId ?? '').trim() || null);
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
    setSelectedGoalId(String(initialFormData?.goalId ?? initialFormData?.['目标ID'] ?? context?.goalId ?? context?.['目标ID'] ?? context?.__goalContext?.goalId ?? '').trim() || null);
    setSelectedGoalPath(cleanDisplayPath(String(initialFormData?.goalPath ?? initialFormData?.['目标'] ?? context?.goalPath ?? context?.['目标'] ?? context?.__goalContext?.goalPath ?? '')));
    setSelectedTemplateVariantId(String(initialFormData?.templateVariantId ?? initialFormData?.goalTemplateVariantId ?? initialFormData?.goalTemplateId ?? initialFormData?.templateId ?? context?.templateVariantId ?? context?.goalTemplateVariantId ?? context?.goalTemplateId ?? context?.templateId ?? context?.__goalContext?.templateVariantId ?? context?.__goalContext?.goalTemplateId ?? context?.__goalContext?.templateId ?? '').trim() || null);
    setSelectedCycleId(String(initialFormData?.cycleId ?? initialFormData?.['周期ID'] ?? context?.cycleId ?? context?.['周期ID'] ?? context?.__goalContext?.cycleId ?? '').trim() || null);
  }, [initialBlockId, initialThemeId, context]);

  const blocks = useMemo(() => {
    const coreBlocks = getEffectiveCoreBlocks(fullSettings);
    return coreBlocks.length ? coreBlocks : (settings.blocks || []);
  }, [fullSettings, settings.blocks]);
  const themes = useMemo(() => settings.themes || [], [settings.themes]);

  const { availableThemes, themeIdMap, pathToIdMap } = useMemo(() => {
    // Theme 已降级为目标 / 预设的上下文字段，不再通过 Theme × Block override 禁用主题。
    return {
      availableThemes: themes || [],
      themeIdMap: new Map<string, ThemeDefinition>((themes || []).map((t: any) => [t.id, t])),
      pathToIdMap: new Map<string, string>((themes || []).map((t: any) => [t.path, t.id])),
    };
  }, [themes]);

  const selectedGoal = useMemo(() => {
    const goals = fullSettings.goalSettings?.goals || [];
    return (selectedGoalId ? goals.find((goal) => goal.id === selectedGoalId) : null)
      || (selectedGoalPath ? goals.find((goal) => getGoalPath(goal) === selectedGoalPath) : null)
      || null;
  }, [fullSettings.goalSettings?.goals, selectedGoalId, selectedGoalPath]);


  const currentEffectiveBlockIdForTemplates = useMemo(
    () => resolveQuickInputCoreBlockId(fullSettings, currentBlockId),
    [fullSettings.coreBlockSettings, fullSettings.inputSettings?.blocks, currentBlockId]
  );

  const goalTemplateVariants = useMemo(() => {
    const goal = selectedGoal || null;
    if (!goal || !currentEffectiveBlockIdForTemplates) return [];
    return getGoalTemplateVariants(fullSettings.goalSettings, goal, currentEffectiveBlockIdForTemplates);
  }, [fullSettings.goalSettings, selectedGoal, currentEffectiveBlockIdForTemplates]);

  useEffect(() => {
    if (!goalTemplateVariants.length) {
      if (selectedTemplateVariantId) setSelectedTemplateVariantId(null);
      return;
    }
    const exists = selectedTemplateVariantId && goalTemplateVariants.some((template) => template.variantId === selectedTemplateVariantId || template.id === selectedTemplateVariantId);
    if (!exists) {
      const next = goalTemplateVariants.find((template) => template.isDefault) || goalTemplateVariants[0];
      setSelectedTemplateVariantId(next?.variantId || 'default');
    }
  }, [goalTemplateVariants, selectedTemplateVariantId]);

  const { template: rawTemplate, theme, goal: resolvedGoal, templateId, templateSourceType, effectiveBlockId, templateVariantId: resolvedTemplateVariantId } = useMemo(() => GoalTemplateResolver.resolve({
    settings: fullSettings,
    blockId: currentBlockId,
    goalId: selectedGoal?.id || selectedGoalId,
    goalPath: selectedGoalPath,
    themeId: selectedThemeId || undefined,
    templateVariantId: selectedTemplateVariantId || undefined,
  }), [
    fullSettings,
    currentBlockId,
    selectedGoal?.id,
    selectedGoalId,
    selectedGoalPath,
    selectedThemeId,
    selectedTemplateVariantId,
  ]);

  const goalOptions = useMemo<GoalSelectorOption[]>(() => {
    const seen = new Set<string>();
    const sourceGoals = sortGoalsLikePresetMatrix([...(fullSettings.goalSettings?.goals || [])])
      .filter((goal) => goal.status !== 'archived')
      .filter((goal) => goalHasDirectEnabledPreset(fullSettings, goal, currentEffectiveBlockIdForTemplates));

    const result: GoalSelectorOption[] = [];
    for (const [index, goal] of sourceGoals.entries()) {
      const normalized = cleanDisplayPath(goal.goalPath || goal.title);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      const leaf = normalized.split('/').filter(Boolean).pop() || normalized;
      result.push({
        id: goal.id || makeGoalIdFromPath(normalized),
        value: normalized,
        label: cleanDisplaySegment(goal.title) || leaf,
        order: index,
        goal,
        themePath: goal.themePath ?? null,
      });
    }
    return result;
  }, [fullSettings.goalSettings, currentEffectiveBlockIdForTemplates]);

  const goalFieldOptions = useMemo(() => goalOptions.map((goal) => ({ value: goal.value, label: goal.label })), [goalOptions]);

  useEffect(() => {
    const selectedPath = cleanDisplayPath(selectedGoal?.goalPath || selectedGoalPath || null);
    if (!selectedPath) return;
    const stillVisible = goalOptions.some((option) => cleanDisplayPath(option.value) === selectedPath);
    if (stillVisible) return;
    setSelectedGoalId(null);
    setSelectedGoalPath(null);
    setSelectedTemplateVariantId(null);
    setSelectedCycleId(null);
    setFormData((current) => {
      const next = { ...current };
      ['goalId', '目标ID', 'goalPath', '目标', 'rootGoal', 'leafGoal', 'cycleId', '周期ID', '周期', '周期粒度', 'templateId', 'goalTemplateId', 'templateVariantId', 'goalTemplateVariantId'].forEach((key) => delete next[key]);
      return next;
    });
    setFieldSources((current) => {
      const next = { ...current };
      ['goalId', '目标ID', 'goalPath', '目标', 'rootGoal', 'leafGoal', 'cycleId', '周期ID', '周期', '周期粒度', 'templateId', 'goalTemplateId', 'templateVariantId', 'goalTemplateVariantId'].forEach((key) => delete next[key]);
      return next;
    });
  }, [goalOptions, selectedGoal?.goalPath, selectedGoalPath]);

  const currentGoalPath = selectedGoalPath || getGoalPath(selectedGoal || resolvedGoal) || null;
  const currentGoalTitle = cleanDisplaySegment(selectedGoal?.title || resolvedGoal?.title || '') || (currentGoalPath ? currentGoalPath.split('/').filter(Boolean).pop() || currentGoalPath : null);
  const currentGoalParts = splitPathParts(currentGoalPath);
  const currentRecordDate = String(formData['日期'] ?? formData.date ?? dayjs().format('YYYY-MM-DD')).trim();
  const periodPolicy = resolveTemplatePeriodPolicy(rawTemplate as any);
  const currentPeriod = periodPolicy ? resolveDerivedPeriod(currentRecordDate || dayjs().format('YYYY-MM-DD'), periodPolicy.granularity) : null;
  const currentPeriodFields = currentPeriod ? { cycleId: currentPeriod.id, periodId: currentPeriod.id, periodLabel: currentPeriod.label, '周期ID': currentPeriod.id, '周期': currentPeriod.label, '周期粒度': currentPeriod.granularity } : {};
  const currentPeriodOptions = currentPeriod ? { cycleId: [{ value: currentPeriod.id, label: currentPeriod.label }], '周期ID': [{ value: currentPeriod.id, label: currentPeriod.label }], '周期': [{ value: currentPeriod.label, label: currentPeriod.label }] } : {};

  const template = useMemo(() => {
    if (!rawTemplate?.fields?.length) return rawTemplate;
    const themeFieldOptions = themeOptions(availableThemes);
    return {
      ...rawTemplate,
      coreBlockId: effectiveBlockId || rawTemplate.coreBlockId,
      fields: rawTemplate.fields.map((field: any) => {
        const semantic = getTemplateFieldSemantic(field);
        if (semantic === 'goals') return { ...field, options: goalFieldOptions };
        if (semantic === 'themePath') return { ...field, type: field.type === 'path' ? 'hierarchicalSingleSelect' : field.type, options: themeFieldOptions };
        return field;
      }),
    };
  }, [rawTemplate, availableThemes, effectiveBlockId, goalFieldOptions]);

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

    const dataForParsing = {
      ...context,
      goal: { id: selectedGoal?.id || selectedGoalId || '', title: currentGoalTitle || '', path: currentGoalPath || '', themePath: selectedGoal?.themePath || theme?.path || '' },
      goalId: selectedGoal?.id || selectedGoalId || '',
      goalPath: currentGoalPath || '',
      ...(currentPeriod ? {
        period: currentPeriod,
        cycle: { id: currentPeriod.id, title: currentPeriod.label, startDate: currentPeriod.startDate, endDate: currentPeriod.endDate },
        cycleId: currentPeriod.id,
        periodId: currentPeriod.id,
        periodLabel: currentPeriod.label,
      } : {}),
      theme: theme ? { path: theme.path, icon: theme.icon || '' } : { path: selectedGoal?.themePath || '', icon: '' },
    };

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
            if (['select', 'singleSelect', 'radio', 'rating'].includes(field.type)) {
              if (isOptionLike(contextValue)) {
                const rawValue = String(contextValue.value ?? '');
                const rawLabel = String(contextValue.label ?? '');
                const matched = (field.options || []).find((opt: any) => {
                  const optLabel = String(opt.label || opt.value || '');
                  const optValue = String(opt.value || '');
                  return optValue === rawValue || optLabel === rawLabel || optValue === rawLabel || optLabel === rawValue;
                });
                assignValue(key, matched ? { value: matched.value, label: matched.label || matched.value } : { value: contextValue.value, label: contextValue.label || contextValue.value }, 'context');
              } else {
                const rawString = contextValue !== null && contextValue !== undefined ? String(contextValue) : '';
                const leafString = getLeafPath(rawString) || rawString;
                const matched = (field.options || []).find((opt: any) => {
                  const optLabel = String(opt.label || opt.value || '');
                  const optValue = String(opt.value || '');
                  return optValue === rawString || optLabel === rawString || optLabel === leafString || String(optLabel) === String(rawString);
                });
                assignValue(key, matched ? { value: matched.value, label: matched.label || matched.value } : contextValue, 'context');
              }
            } else {
              assignValue(key, contextValue, 'context');
            }
          }
          return;
        }

        if (!canRefresh) return;

        const isSelectable = ['select', 'singleSelect', 'radio', 'rating'].includes(field.type);
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
  }, [template, theme, context, timeDirection, selectedGoal?.id, selectedGoal?.themePath, selectedGoalId, currentPeriod?.id, currentPeriod?.label, currentGoalPath, currentGoalTitle]);

  useEffect(() => {
    const presetThemePath = String(formData.themePath ?? formData['主题'] ?? '').trim();
    if (!presetThemePath) return;
    const nextThemeId = pathToIdMap.get(presetThemePath) ?? null;
    if (nextThemeId && nextThemeId !== selectedThemeId) setSelectedThemeId(nextThemeId);
  }, [formData.themePath, formData['主题'], pathToIdMap, selectedThemeId]);

  useEffect(() => {
    const currentTheme = selectedThemeId ? themeIdMap.get(selectedThemeId) ?? theme ?? null : theme ?? null;
    const effectiveThemePath = String(formData.themePath ?? formData['主题'] ?? currentTheme?.path ?? selectedGoal?.themePath ?? '').trim();
    const themeParts = splitThemePathParts(effectiveThemePath || null);
    onStateChange?.({
      blockId: currentBlockId,
      coreBlockId: effectiveBlockId,
      goalId: selectedGoal?.id || selectedGoalId,
      goalPath: currentGoalPath,
      goalTitle: currentGoalTitle,
      rootGoal: currentGoalParts.root,
      leafGoal: currentGoalParts.leaf,
      cycleId: currentPeriod?.id || null,
      themeId: selectedThemeId,
      formData: { ...formData, templateId: templateId || undefined, goalTemplateId: templateId || undefined, templateVariantId: resolvedTemplateVariantId || selectedTemplateVariantId || undefined, goalTemplateVariantId: resolvedTemplateVariantId || selectedTemplateVariantId || undefined, ...currentPeriodFields, __timeDirection: timeDirection },
      meta: { timeDirection },
      template,
      theme: currentTheme,
      templateId,
      templateVariantId: resolvedTemplateVariantId || selectedTemplateVariantId,
      templateSourceType,
      fieldSources,
      ...themeParts,
      fieldSourceSummary: buildFieldSourceSummary(fieldSources),
    });
  }, [currentBlockId, effectiveBlockId, selectedGoal?.id, selectedGoalId, currentGoalPath, currentGoalTitle, currentGoalParts.root, currentGoalParts.leaf, selectedThemeId, selectedCycleId, formData, timeDirection, template, templateId, templateSourceType, resolvedTemplateVariantId, selectedTemplateVariantId, fieldSources, theme]);

  const emitDraftState = (draftFormData: Record<string, any>, directionOverride: TimeDirection = timeDirection, sourceOverride: QuickInputFieldSourceMap = fieldSources) => {
    const currentTheme = selectedThemeId ? themeIdMap.get(selectedThemeId) ?? theme ?? null : theme ?? null;
    const effectiveThemePath = String(draftFormData.themePath ?? draftFormData['主题'] ?? currentTheme?.path ?? selectedGoal?.themePath ?? '').trim();
    const themeParts = splitThemePathParts(effectiveThemePath || null);
    onStateChange?.({
      blockId: currentBlockId,
      coreBlockId: effectiveBlockId,
      goalId: selectedGoal?.id || selectedGoalId,
      goalPath: currentGoalPath,
      goalTitle: currentGoalTitle,
      rootGoal: currentGoalParts.root,
      leafGoal: currentGoalParts.leaf,
      cycleId: currentPeriod?.id || null,
      themeId: selectedThemeId,
      formData: { ...draftFormData, templateId: templateId || undefined, goalTemplateId: templateId || undefined, templateVariantId: resolvedTemplateVariantId || selectedTemplateVariantId || undefined, goalTemplateVariantId: resolvedTemplateVariantId || selectedTemplateVariantId || undefined, ...currentPeriodFields, __timeDirection: directionOverride },
      meta: { timeDirection: directionOverride },
      template,
      theme: currentTheme,
      templateId,
      templateVariantId: resolvedTemplateVariantId || selectedTemplateVariantId,
      templateSourceType,
      fieldSources: sourceOverride,
      ...themeParts,
      fieldSourceSummary: buildFieldSourceSummary(sourceOverride),
    });
  };

  const handleUpdateField = (key: string, value: any, isOptionObject = false) => {
    const rawValue = isOptionObject ? value?.value : value;
    if (key === 'themePath' || key === '主题') {
      const nextPath = String(rawValue ?? '').trim();
      setSelectedThemeId(nextPath ? pathToIdMap.get(nextPath) ?? null : null);
    }
    if (key === 'goalPath' || key === '目标' || key === '目标路径') {
      const nextGoalPath = cleanDisplayPath(String(rawValue ?? ''));
      setSelectedGoalPath(nextGoalPath);
      setSelectedGoalId(nextGoalPath ? makeGoalIdFromPath(nextGoalPath) : null);
    }
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
    ['内容', 'content', '日期', 'date', '时间', 'time', '备注', 'note', 'description', '目标', '目标ID', 'goalId', 'goalPath', 'themePath', '主题'].forEach((k) => {
      if (formData[k] !== undefined) preserved[k] = formData[k];
      if (fieldSources[k]) preservedSources[k] = fieldSources[k];
    });
    setSelectedTemplateVariantId(null);
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


  const handleCreateGoal = async (goalPath: string) => {
    const normalized = cleanDisplayPath(goalPath);
    if (!normalized) return;
    const title = normalized.split('/').filter(Boolean).pop() || normalized;
    const effectiveThemePath = String(formData.themePath ?? formData['主题'] ?? theme?.path ?? selectedGoal?.themePath ?? '').trim() || null;
    const goal = await useCases.goal.addGoal({ title, goalPath: normalized, themePath: effectiveThemePath });
    if (!goal) return;
    handleSelectGoal({
      id: goal.id,
      value: goal.goalPath || normalized,
      label: goal.title,
      goal,
      themePath: goal.themePath || null,
    });
  };

  const handleSelectGoal = (option: GoalSelectorOption | null) => {
    if (!option || !option.value) {
      setSelectedGoalId(null);
      setSelectedGoalPath(null);
      setSelectedTemplateVariantId(null);
      return;
    }
    const goal = option.goal || null;
    const goalPath = cleanDisplayPath(goal?.goalPath || option.value);
    const goalId = goal?.id || (option.id && !String(option.id).startsWith('goal:') ? option.id : makeGoalIdFromPath(goalPath || option.value));
    const themePath = goal?.themePath || option.themePath || null;
    setSelectedGoalId(goalId);
    setSelectedGoalPath(goalPath || option.value);
    setSelectedTemplateVariantId(null);
    if (themePath) setSelectedThemeId(pathToIdMap.get(themePath) ?? null);

    setFormData((cur) => {
      const next = { ...cur };
      const nextSources: QuickInputFieldSourceMap = { ...fieldSources };
      const assign = (key: string, value: unknown, source: QuickInputFieldSource = 'goal_context') => {
        if (value === undefined || value === null || value === '') return;
        const currentSource = nextSources[key];
        const hasUserValue = currentSource === 'user' && isMeaningfulValue(next[key]);
        if (hasUserValue) return;
        next[key] = value;
        nextSources[key] = source;
      };
      assign('goalId', goalId);
      assign('目标ID', goalId);
      assign('goalPath', goalPath || option.value);
      assign('目标', goalPath || option.value);
      const parts = splitGoalPath(cleanDisplayPath(goalPath || option.value) || '');
      assign('rootGoal', parts.rootGoal || '', 'goal_context');
      assign('leafGoal', parts.leafGoal || '', 'goal_context');
      if (themePath) {
        assign('themePath', themePath, 'goal_context');
        assign('主题', themePath, 'goal_context');
      }
      setSelectedCycleId(null);
      setFieldSources(nextSources);
      return next;
    });
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
      goals={goalOptions}
      selectedGoalPath={currentGoalPath}
      onSelectGoal={handleSelectGoal}
      onCreateGoal={undefined}
      templateVariants={goalTemplateVariants.map((template) => ({ value: template.variantId || 'default', label: template.name || template.variantId || '默认模板', isDefault: !!template.isDefault }))}
      selectedTemplateVariantId={resolvedTemplateVariantId || selectedTemplateVariantId}
      onSelectTemplateVariant={setSelectedTemplateVariantId}
      cycles={[]}
      selectedCycleId={currentPeriod?.id || null}
      onSelectCycle={undefined}
      template={template}
      formData={formData}
      fieldValueOptionsByKey={{ themePath: themeOptions(availableThemes), '主题': themeOptions(availableThemes), ...currentPeriodOptions }}
      timeDirection={timeDirection}
      dense={dense}
      showDivider={showDivider}
      onUpdateField={handleUpdateField}
      onTimeDirectionChange={handleTimeDirectionChange}
      onRequestSubmit={onRequestSubmit}
      isMobileLike={isMobileLike}
      showTimeDirectionControl={showTimeDirectionControl}
      currentThemePath={String(formData.themePath ?? formData['主题'] ?? theme?.path ?? selectedGoal?.themePath ?? '') || null}
      currentPeriodLabel={currentPeriod?.label || null}
      templateSourceType={templateSourceType}
      fieldSourceSummary={buildFieldSourceSummary(fieldSources)}
    />
  );
}
