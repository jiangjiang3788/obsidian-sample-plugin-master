import type { TemplateField, ThemeDefinition } from '@core/types/public';
import { getTemplateFieldSemantic } from '@core/fields/public';

import { themeOptions } from '../quickInputPathModel';
import type { QuickInputPeriodLike, QuickInputFormData, QuickInputTemplateLike } from './types';

const TASK_STATUS_FIELD: TemplateField = {
  id: 'core.task.status', key: 'status', label: '状态', type: 'singleSelect', semantic: 'status', defaultValue: 'open', autoSelectFirst: true,
  options: [
    { value: 'open', label: '未完成' },
    { value: 'done', label: '已完成' },
  ],
};
const TASK_CONTENT_FIELD: TemplateField = { id: 'core.task.content', key: '任务内容', label: '内容', type: 'text', semantic: 'body' };
const TASK_RECURRENCE_FIELD: TemplateField = {
  id: 'core.task.recurrenceUnit', key: 'recurrenceUnit', label: '重复', type: 'singleSelect', semantic: 'recurrence', defaultValue: 'none', autoSelectFirst: true,
  options: [
    { value: 'none', label: '不重复' }, { value: 'day', label: '天' }, { value: 'week', label: '周' },
    { value: 'month', label: '月' }, { value: 'quarter', label: '季' }, { value: 'year', label: '年' },
  ],
};
const TASK_RECURRENCE_INTERVAL_FIELD: TemplateField = { id: 'core.task.recurrenceInterval', key: 'recurrenceInterval', label: '重复间隔', type: 'number', min: 1, defaultValue: '1' };
const TASK_START_FIELD: TemplateField = { id: 'core.task.startAt', key: 'startAt', label: '开始/预计时间', type: 'datetime', semantic: 'startTime' };
const TASK_END_FIELD: TemplateField = { id: 'core.task.endAt', key: 'endAt', label: '结束时间', type: 'datetime', semantic: 'endTime' };
const TASK_DURATION_FIELD: TemplateField = { id: 'core.task.expectedDurationMinutes', key: 'expectedDurationMinutes', label: '时长（分钟）', type: 'number', semantic: 'duration', min: 1 };

function keyOf(field: TemplateField): string {
  return String(field.key || field.label || '').trim();
}

function isTaskTemplate(rawTemplate: QuickInputTemplateLike, effectiveBlockId: string | null | undefined): boolean {
  return String(effectiveBlockId || rawTemplate.coreBlockId || rawTemplate.id || '').replace(/^core\./, '') === 'task';
}

function findField(fields: TemplateField[], predicate: (field: TemplateField) => boolean): TemplateField | undefined {
  return fields.find(predicate);
}

function normalizeTaskFields(fields: TemplateField[]): TemplateField[] {
  const legacyStartKeys = new Set(['scheduledAt', '计划时间', 'scheduledDate', '计划日期', 'startAt', '开始时间', '开始/预计时间']);
  const legacyEndKeys = new Set(['endAt', '结束时间']);
  const hiddenLegacyKeys = new Set(['dueAt', '截止时间', 'dueDate', '截止日期', 'startDate', '开始日期', 'recurrenceAnchor', '重复锚点']);

  const statusExisting = findField(fields, (field) => getTemplateFieldSemantic(field) === 'status' || keyOf(field) === 'status');
  const bodyExisting = findField(fields, (field) => getTemplateFieldSemantic(field) === 'body');
  const recurrenceExisting = findField(fields, (field) => getTemplateFieldSemantic(field) === 'recurrence' || keyOf(field) === 'recurrenceUnit');
  const recurrenceIntervalExisting = findField(fields, (field) => keyOf(field) === 'recurrenceInterval' || keyOf(field) === '重复间隔');
  const durationExisting = findField(fields, (field) => getTemplateFieldSemantic(field) === 'duration' || ['expectedDurationMinutes', '预计时长', '时长', '时长（分钟）'].includes(keyOf(field)));
  const startExisting = findField(fields, (field) => legacyStartKeys.has(keyOf(field)));
  const endExisting = findField(fields, (field) => legacyEndKeys.has(keyOf(field)));

  const reserved = new Set<TemplateField>([
    statusExisting, bodyExisting, recurrenceExisting, recurrenceIntervalExisting, startExisting, endExisting, durationExisting,
  ].filter(Boolean) as TemplateField[]);

  const rest = fields.filter((field) => {
    if (reserved.has(field)) return false;
    if (hiddenLegacyKeys.has(keyOf(field))) return false;
    return true;
  });

  // Task 创建表单的单选字段统一以第一项为默认值。
  // 这是 UI 录入策略，不改变底层 schema 对历史值的兼容能力。
  const normalizedRest = rest.map((field) => {
    if (!['select', 'singleSelect', 'radio'].includes(field.type) || !field.options?.length) return field;
    return {
      ...field,
      autoSelectFirst: true,
      defaultValue: field.options[0]?.value,
    };
  });

  // themePath 继续留在模板里作为系统上下文字段，Fields 层会统一隐藏。这样 GoalTemplate 的主题默认值仍能进入 formData/最终记录。
  // Task 状态的录入语义只暴露“未完成 / 已完成”；取消/跳过仍由底层记录模型兼容历史数据与其他工作流。
  const status: TemplateField = {
    ...TASK_STATUS_FIELD,
    ...(statusExisting || {}),
    label: '状态',
    type: 'singleSelect',
    semantic: 'status',
    autoSelectFirst: true,
    defaultValue: 'open',
    options: TASK_STATUS_FIELD.options,
  };
  const body: TemplateField = { ...TASK_CONTENT_FIELD, ...(bodyExisting || {}), label: '内容', type: 'text', semantic: 'body' };
  const recurrenceOptions = recurrenceExisting?.options?.length ? recurrenceExisting.options : TASK_RECURRENCE_FIELD.options;
  const recurrence: TemplateField = {
    ...TASK_RECURRENCE_FIELD,
    ...(recurrenceExisting || {}),
    label: '重复',
    type: 'singleSelect',
    semantic: 'recurrence',
    autoSelectFirst: true,
    defaultValue: recurrenceOptions?.[0]?.value ?? 'none',
    options: recurrenceOptions,
  };
  const recurrenceInterval: TemplateField = { ...TASK_RECURRENCE_INTERVAL_FIELD, ...(recurrenceIntervalExisting || {}), label: '重复间隔', type: 'number', min: recurrenceIntervalExisting?.min ?? 1, defaultValue: recurrenceIntervalExisting?.defaultValue || '1' };
  const start: TemplateField = { ...TASK_START_FIELD, ...(startExisting || {}), key: 'startAt', label: '开始/预计时间', type: 'datetime', semantic: 'startTime' };
  const end: TemplateField = { ...TASK_END_FIELD, ...(endExisting || {}), key: 'endAt', label: '结束时间', type: 'datetime', semantic: 'endTime' };
  const duration: TemplateField = { ...TASK_DURATION_FIELD, ...(durationExisting || {}), key: 'expectedDurationMinutes', label: '时长（分钟）', type: 'number', semantic: 'duration', min: durationExisting?.min ?? 1 };

  return [status, body, recurrence, recurrenceInterval, start, end, duration, ...normalizedRest];
}

export function buildQuickInputDisplayTemplate(
  rawTemplate: QuickInputTemplateLike | null | undefined,
  effectiveBlockId: string | null | undefined,
  availableThemes: ThemeDefinition[],
  goalFieldOptions: Array<{ value: string; label: string }>,
): QuickInputTemplateLike | null {
  if (!rawTemplate?.fields?.length) return rawTemplate ?? null;
  const themeFieldOptions = themeOptions(availableThemes);
  const task = isTaskTemplate(rawTemplate, effectiveBlockId);

  const mappedFields = rawTemplate.fields.map((field: TemplateField) => {
    const semantic = getTemplateFieldSemantic(field);
    if (semantic === 'goalPath') return { ...field, options: goalFieldOptions };
    if (semantic === 'themePath') {
      return {
        ...field,
        type: field.type === 'path' ? 'hierarchicalSingleSelect' : field.type,
        options: themeFieldOptions,
      };
    }
    if (task && ['select', 'singleSelect', 'radio'].includes(field.type) && field.options?.length) {
      return { ...field, autoSelectFirst: true };
    }
    return field;
  });

  return {
    ...rawTemplate,
    coreBlockId: effectiveBlockId || rawTemplate.coreBlockId,
    fields: task ? normalizeTaskFields(mappedFields) : mappedFields,
  };
}

export function shouldShowQuickInputTimeDirectionControl(
  template: QuickInputTemplateLike | null | undefined,
): boolean {
  if (!template?.fields) return false;
  const keys = new Set((template.fields || []).map((field: TemplateField) => field.key || field.label));
  return keys.has('时间') && keys.has('结束') && keys.has('时长');
}

export function buildQuickInputPeriodUi(currentPeriod: QuickInputPeriodLike | null): {
  fields: QuickInputFormData;
  options: Record<string, Array<{ value: string; label: string }>>;
} {
  return {
    fields: currentPeriod
      ? {
          cycleId: currentPeriod.id,
          periodId: currentPeriod.id,
          periodLabel: currentPeriod.label,
          周期ID: currentPeriod.id,
          周期: currentPeriod.label,
          周期粒度: currentPeriod.granularity,
        } satisfies QuickInputFormData
      : {},
    options: currentPeriod
      ? {
          cycleId: [{ value: currentPeriod.id, label: currentPeriod.label }],
          周期ID: [{ value: currentPeriod.id, label: currentPeriod.label }],
          周期: [{ value: currentPeriod.label, label: currentPeriod.label }],
        }
      : {},
  };
}
