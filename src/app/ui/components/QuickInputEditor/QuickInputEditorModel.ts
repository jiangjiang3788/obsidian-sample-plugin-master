import type { GoalDefinition, RecordInputMeta, ThemeDefinition } from '@core/public';
import { dayjs, getGoalTemplates, getLeafPath, renderTemplate, splitGoalPath } from '@core/public';
import { computeLinkedTimeChanges, finalizeLinkedTimeFields } from '@shared/public';

import type { GoalSelectorOption } from './components/GoalSelector';

// 稳定空引用：避免调用方传入 `initialFormData={{}}` 造成死循环。
export const EMPTY_FORM_DATA: Record<string, any> = {};

export type TimeDirection = 'forward' | 'backward';

/**
 * 字段值来源分层：
 * - user: 用户手动输入
 * - context/edit_backfill/invocation_context: 外部上下文或编辑态回填
 * - goal_context/theme_context: 目标或主题上下文推导
 * - template_default/system_auto: 模板默认值或系统自动值
 */
export type QuickInputFieldSource = 'user' | 'context' | 'edit_backfill' | 'invocation_context' | 'goal_context' | 'theme_context' | 'template_default' | 'system_auto';
export type QuickInputFieldSourceMap = Record<string, QuickInputFieldSource>;

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

/** 将“时间/结束/时长”字段收敛成最终数据，并去掉编辑态元字段。 */
export function finalizeQuickInputFormData(formData: Record<string, any>) {
  const finalData = { ...formData };
  const direction = finalData.__timeDirection === 'backward' ? 'backward' : 'forward';
  delete finalData.lastChanged;
  delete finalData.__timeDirection;
  return finalizeLinkedTimeFields(finalData, { startKey: '时间', endKey: '结束', durationKey: '时长' }, { durationOutput: 'number', direction });
}

export const isMeaningfulValue = (value: any) => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value !== '';
  return true;
};

export const isOptionLike = (value: any) => !!value && typeof value === 'object' && 'value' in value && 'label' in value;

export const isSameValue = (a: any, b: any) => {
  if (isOptionLike(a) && isOptionLike(b)) {
    return a.value === b.value && a.label === b.label;
  }
  return a === b;
};

export const isRefreshableSource = (source?: QuickInputFieldSource) => source === undefined || source === 'template_default' || source === 'system_auto' || source === 'goal_context' || source === 'theme_context';

export const buildInitialFieldSources = (initialData?: Record<string, any>): QuickInputFieldSourceMap => {
  const next: QuickInputFieldSourceMap = {};
  if (!initialData) return next;
  Object.keys(initialData).forEach((key) => {
    if (key === '__timeDirection' || key === 'lastChanged') return;
    if (!isMeaningfulValue(initialData[key])) return;
    next[key] = 'context';
  });
  return next;
};

export function cleanDisplaySegment(value: unknown): string {
  return String(value ?? '').replace(/^[#＃]+\s*/, '').trim();
}

export function cleanDisplayPath(value?: string | null): string | null {
  const normalized = splitGoalPath(value).goalPath;
  if (!normalized) return null;
  const parts = normalized.split('/').map(cleanDisplaySegment).filter(Boolean);
  return parts.length ? parts.join('/') : null;
}

export const splitThemePathParts = (path?: string | null) => {
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

export const splitPathParts = (path?: string | null) => {
  const parts = String(path || '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
  return { path: parts.length ? parts.join('/') : null, root: parts[0] || null, leaf: parts.length ? parts[parts.length - 1] : null };
};

export function getGoalPath(goal?: GoalDefinition | null): string | null {
  if (!goal) return null;
  return cleanDisplayPath(goal.goalPath || goal.title);
}

export function makeGoalIdFromPath(path: string): string {
  return `goal:${path}`;
}

export function themeOptions(themes: ThemeDefinition[]) {
  return (themes || []).map((theme) => ({ value: theme.path, label: cleanDisplaySegment(theme.path.split('/').filter(Boolean).pop() || theme.path), icon: theme.icon }));
}

export const buildFieldSourceSummary = (sources: QuickInputFieldSourceMap): Record<QuickInputFieldSource, number> => ({
  user: Object.values(sources).filter((v) => v === 'user').length,
  context: Object.values(sources).filter((v) => v === 'context').length,
  edit_backfill: Object.values(sources).filter((v) => v === 'edit_backfill').length,
  invocation_context: Object.values(sources).filter((v) => v === 'invocation_context').length,
  goal_context: Object.values(sources).filter((v) => v === 'goal_context').length,
  theme_context: Object.values(sources).filter((v) => v === 'theme_context').length,
  template_default: Object.values(sources).filter((v) => v === 'template_default').length,
  system_auto: Object.values(sources).filter((v) => v === 'system_auto').length,
});

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

function goalHasDirectEnabledPreset(fullSettings: any, goal: GoalDefinition, coreBlockId: string): boolean {
  if (!goal?.id || !coreBlockId) return false;
  return getGoalTemplates(fullSettings.goalSettings)
    .some((template) => template.enabled !== false && template.goalId === goal.id && template.coreBlockId === coreBlockId);
}

export function buildQuickInputGoalOptions(fullSettings: any, coreBlockId: string): GoalSelectorOption[] {
  const seen = new Set<string>();
  const sourceGoals = sortGoalsLikePresetMatrix([...(fullSettings.goalSettings?.goals || [])])
    .filter((goal) => goal.status !== 'archived')
    .filter((goal) => goalHasDirectEnabledPreset(fullSettings, goal, coreBlockId));

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
}

export function resolveQuickInputCoreBlockId(_fullSettings: any, blockId: string): string {
  return String(blockId || '');
}

export function applyQuickInputLinkedTimeChanges(draft: Record<string, any>, direction: TimeDirection) {
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
}


export interface HydrateQuickInputTemplateDefaultsInput {
  template: any;
  context?: Record<string, any>;
  current: Record<string, any>;
  fieldSources: QuickInputFieldSourceMap;
  selectedGoal?: GoalDefinition | null;
  selectedGoalId?: string | null;
  currentGoalPath?: string | null;
  currentGoalTitle?: string | null;
  theme?: ThemeDefinition | null;
  currentPeriod?: any | null;
  timeDirection: TimeDirection;
}

export function hydrateQuickInputTemplateDefaults({
  template,
  context,
  current,
  fieldSources,
  selectedGoal,
  selectedGoalId,
  currentGoalPath,
  currentGoalTitle,
  theme,
  currentPeriod,
  timeDirection,
}: HydrateQuickInputTemplateDefaultsInput) {
  if (!template) return { changed: false, formData: current, fieldSources };

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

  if (!changed) return { changed: false, formData: current, fieldSources };

  const finalized = finalizeLinkedTimeFields(next, { startKey: '时间', endKey: '结束', durationKey: '时长' }, { durationOutput: 'number', direction: timeDirection });
  const autoComputedKeys: string[] = [];
  if (finalized['时间'] !== next['时间']) autoComputedKeys.push('时间');
  if (finalized['结束'] !== next['结束']) autoComputedKeys.push('结束');
  if (finalized['时长'] !== next['时长']) autoComputedKeys.push('时长');
  autoComputedKeys.forEach((key) => {
    next[key] = finalized[key];
    nextSources[key] = 'system_auto';
  });

  return { changed: true, formData: next, fieldSources: nextSources };
}
