import type { TemplateField } from '@core/types/public';
import { getTemplateFieldSemantic } from '@core/fields/public';
import { TASK_STATUS_PRESENTATION } from '@core/records/public';

import type { QuickInputPeriodLike, QuickInputFormData, QuickInputTemplateLike } from './types';

const TASK_STATUS_FIELD: TemplateField = {
  id: 'core.task.status', key: 'status', label: '状态', type: 'singleSelect', semantic: 'status', defaultValue: 'open', autoSelectFirst: true,
  options: [
    { value: 'open', label: `${TASK_STATUS_PRESENTATION.open.emoji} ${TASK_STATUS_PRESENTATION.open.label}` },
    { value: 'done', label: `${TASK_STATUS_PRESENTATION.done.emoji} ${TASK_STATUS_PRESENTATION.done.label}` },
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
const TASK_RECURRENCE_ANCHOR_FIELD: TemplateField = {
  id: 'core.task.recurrenceAnchor', key: 'recurrenceAnchor', label: '重复方式', type: 'singleSelect', defaultValue: 'scheduled', autoSelectFirst: true,
  options: [
    { value: 'scheduled', label: '固定计划' },
    { value: 'completion', label: '完成后重复' },
  ],
};
const TASK_SCHEDULED_FIELD: TemplateField = { id: 'core.task.scheduledAt', key: 'scheduledAt', label: '计划时间', type: 'datetime', semantic: 'startTime' };
const TASK_DUE_FIELD: TemplateField = { id: 'core.task.dueAt', key: 'dueAt', label: '截止时间', type: 'datetime' };
const TASK_START_FIELD: TemplateField = { id: 'core.task.startAt', key: 'startAt', label: '实际开始', type: 'datetime', semantic: 'startTime' };
const TASK_END_FIELD: TemplateField = { id: 'core.task.endAt', key: 'endAt', label: '实际结束', type: 'datetime', semantic: 'endTime' };
const TASK_DURATION_FIELD: TemplateField = { id: 'core.task.expectedDurationMinutes', key: 'expectedDurationMinutes', label: '预计时长（分钟）', type: 'number', semantic: 'duration', min: 1 };

export type TaskQuickInputTimingMode = 'plan' | 'execution';

function readScalarValue(value: unknown): string {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const option = value as Record<string, unknown>;
    return String(option.value ?? option.label ?? '').trim();
  }
  return String(value ?? '').trim();
}

/**
 * Task time fields are chosen from semantic intent, not from the surface that opened QuickInput.
 * Timeline retrospective capture is always execution. Ordinary create switches to execution
 * as soon as the user marks the new Task done. Existing Task edit keeps plan fields; actual
 * TaskSession editing remains a separate execution-record workflow.
 */
export function resolveTaskQuickInputTimingMode(input: {
  context?: Record<string, unknown> | null;
  formData?: Record<string, unknown> | null;
  recordInputMode?: 'create' | 'edit';
  effectiveBlockId?: string | null;
}): TaskQuickInputTimingMode {
  const blockId = String(input.effectiveBlockId || '').replace(/^core\./, '');
  if (blockId && blockId !== 'task') return 'plan';

  const uiContext = input.context?.__recordUiContext;
  if (uiContext && typeof uiContext === 'object' && !Array.isArray(uiContext)) {
    const ui = uiContext as Record<string, unknown>;
    if (ui.kind === 'timeline_create' && ui.captureMode === 'completed_execution') return 'execution';
  }

  if ((input.recordInputMode ?? 'create') === 'create') {
    const status = readScalarValue(input.formData?.status ?? input.formData?.['状态']).toLowerCase();
    if (status === 'done') return 'execution';
  }
  return 'plan';
}
export interface QuickInputDisplayTemplateOptions {
  taskTimingMode?: TaskQuickInputTimingMode;
  recordInputMode?: 'create' | 'edit';
}

function keyOf(field: TemplateField): string {
  return String(field.key || field.label || '').trim();
}

function isTaskTemplate(rawTemplate: QuickInputTemplateLike, effectiveBlockId: string | null | undefined): boolean {
  return String(effectiveBlockId || rawTemplate.recordTypeId || rawTemplate.id || '').replace(/^core\./, '') === 'task';
}

function findField(fields: TemplateField[], predicate: (field: TemplateField) => boolean): TemplateField | undefined {
  return fields.find(predicate);
}

function normalizeTaskFields(fields: TemplateField[], timingMode: TaskQuickInputTimingMode = 'plan', recordInputMode: 'create' | 'edit' = 'create'): TemplateField[] {
  const scheduledKeys = new Set(['scheduledAt', '计划时间', 'scheduledDate', '计划日期']);
  const legacyStartKeys = new Set(['startAt', '开始时间', '开始/预计时间']);
  const legacyEndKeys = new Set(['endAt', '结束时间']);
  const dueKeys = new Set(['dueAt', '截止时间', 'dueDate', '截止日期']);
  const hiddenLegacyKeys = new Set(['startDate', '开始日期']);

  const statusExisting = findField(fields, (field) => getTemplateFieldSemantic(field) === 'status' || keyOf(field) === 'status');
  const bodyExisting = findField(fields, (field) => getTemplateFieldSemantic(field) === 'body');
  const recurrenceExisting = findField(fields, (field) => getTemplateFieldSemantic(field) === 'recurrence' || keyOf(field) === 'recurrenceUnit');
  const recurrenceIntervalExisting = findField(fields, (field) => keyOf(field) === 'recurrenceInterval' || keyOf(field) === '重复间隔');
  const recurrenceAnchorExisting = findField(fields, (field) => keyOf(field) === 'recurrenceAnchor' || keyOf(field) === '重复锚点' || keyOf(field) === '重复方式');
  const durationExisting = findField(fields, (field) => getTemplateFieldSemantic(field) === 'duration' || ['expectedDurationMinutes', '预计时长', '预计时长（分钟）', '时长', '时长（分钟）'].includes(keyOf(field)));
  const scheduledExisting = findField(fields, (field) => scheduledKeys.has(keyOf(field)));
  const startExisting = findField(fields, (field) => legacyStartKeys.has(keyOf(field)));
  const endExisting = findField(fields, (field) => legacyEndKeys.has(keyOf(field)));
  const dueExisting = findField(fields, (field) => dueKeys.has(keyOf(field)));

  const reserved = new Set<TemplateField>([
    statusExisting, bodyExisting, recurrenceExisting, recurrenceIntervalExisting, recurrenceAnchorExisting, scheduledExisting, startExisting, endExisting, dueExisting, durationExisting,
  ].filter(Boolean) as TemplateField[]);

  const rest = fields.filter((field) => {
    if (reserved.has(field)) return false;
    if (hiddenLegacyKeys.has(keyOf(field)) || scheduledKeys.has(keyOf(field)) || dueKeys.has(keyOf(field)) || legacyStartKeys.has(keyOf(field)) || legacyEndKeys.has(keyOf(field))) return false;
    return true;
  });

  // Task 创建表单：GoalTemplate / RecordType 已明确配置的默认值优先。
  // 只有字段没有任何默认值时，才退回“第一项”这一 UI 录入策略。
  // 不能在 display 层把 GoalTemplate.defaultValues 覆盖掉，否则模板设置正确、
  // QuickInput 却永远显示第一项（最低/重要/紧急/低...）。
  const normalizedRest = rest.map((field) => {
    if (!['select', 'singleSelect', 'radio'].includes(field.type) || !field.options?.length) return field;
    const configuredDefault = String(field.defaultValue ?? '').trim();
    return {
      ...field,
      autoSelectFirst: true,
      defaultValue: configuredDefault || field.options[0]?.value,
    };
  });

  // Task 状态的录入语义只暴露“未完成 / 已完成”；取消/跳过仍由底层记录模型兼容历史数据与其他工作流。
  const status: TemplateField = {
    ...TASK_STATUS_FIELD,
    ...(statusExisting || {}),
    // Task lifecycle is a system field. Keep one canonical key even when an old
    // GoalTemplate carried a legacy/translated key. Timeline context and persistence
    // both speak `status`, so allowing this key to drift breaks completed capture.
    key: 'status',
    label: '状态',
    type: 'singleSelect',
    semantic: 'status',
    autoSelectFirst: true,
    // Execution capture represents work that already happened. It must not fall back
    // to the ordinary planned-task default merely because a template hydration missed
    // the invocation context on one render.
    defaultValue: timingMode === 'execution' ? 'done' : 'open',
    options: TASK_STATUS_FIELD.options,
  };
  const body: TemplateField = { ...TASK_CONTENT_FIELD, ...(bodyExisting || {}), label: '内容', type: 'text', semantic: 'body' };
  const configuredRecurrenceOptions = recurrenceExisting?.options?.length ? recurrenceExisting.options : TASK_RECURRENCE_FIELD.options;
  const recurrenceOptions = (configuredRecurrenceOptions || []).some((option) => String(option.value) === 'none')
    ? configuredRecurrenceOptions
    : [{ value: 'none', label: '不重复' }, ...(configuredRecurrenceOptions || [])];
  const recurrence: TemplateField = {
    ...TASK_RECURRENCE_FIELD,
    ...(recurrenceExisting || {}),
    label: '重复',
    type: 'singleSelect',
    semantic: 'recurrence',
    autoSelectFirst: true,
    // Creating a TaskSeries is a structural operation, so recurrence must be an
    // explicit capture decision. GoalTemplate defaults can still describe other
    // Task defaults, but they must not silently arm a recurring series.
    defaultValue: 'none',
    options: recurrenceOptions,
  };
  const recurrenceInterval: TemplateField = { ...TASK_RECURRENCE_INTERVAL_FIELD, ...(recurrenceIntervalExisting || {}), label: '重复间隔', type: 'number', min: recurrenceIntervalExisting?.min ?? 1, defaultValue: recurrenceIntervalExisting?.defaultValue || '1' };
  const recurrenceAnchor: TemplateField = {
    ...TASK_RECURRENCE_ANCHOR_FIELD,
    ...(recurrenceAnchorExisting || {}),
    key: 'recurrenceAnchor',
    label: '重复方式',
    type: 'singleSelect',
    defaultValue: recurrenceAnchorExisting?.defaultValue || 'scheduled',
    options: recurrenceAnchorExisting?.options?.length ? recurrenceAnchorExisting.options : TASK_RECURRENCE_ANCHOR_FIELD.options,
  };
  const duration: TemplateField = {
    ...TASK_DURATION_FIELD,
    ...(durationExisting || {}),
    key: 'expectedDurationMinutes',
    label: timingMode === 'execution' ? '时长（分钟）' : '预计时长（分钟）',
    type: 'number',
    semantic: 'duration',
    min: durationExisting?.min ?? 1,
    required: false,
  };

  const timingFields: TemplateField[] = timingMode === 'execution'
    ? [
        { ...TASK_START_FIELD, ...(startExisting || scheduledExisting || {}), key: 'startAt', label: '实际开始', type: 'datetime', semantic: 'startTime' },
        { ...TASK_END_FIELD, ...(endExisting || {}), key: 'endAt', label: '实际结束', type: 'datetime', semantic: 'endTime' },
        duration,
      ]
    : [
        { ...TASK_SCHEDULED_FIELD, ...(scheduledExisting || startExisting || {}), key: 'scheduledAt', label: '计划时间', type: 'datetime', semantic: 'startTime' },
        duration,
        { ...TASK_DUE_FIELD, ...(dueExisting || {}), key: 'dueAt', label: '截止时间', type: 'datetime', semantic: undefined },
      ];

  const lifecycleFields = recordInputMode === 'edit' ? [] : [status];
  const recurrenceFields = timingMode === 'execution' ? [] : [recurrence, recurrenceInterval, recurrenceAnchor];
  return [...lifecycleFields, body, ...recurrenceFields, ...timingFields, ...normalizedRest];
}

export function buildQuickInputDisplayTemplate(
  rawTemplate: QuickInputTemplateLike | null | undefined,
  effectiveBlockId: string | null | undefined,
  goalFieldOptions: Array<{ value: string; label: string }>,
  options: QuickInputDisplayTemplateOptions = {},
): QuickInputTemplateLike | null {
  if (!rawTemplate?.fields?.length) return rawTemplate ?? null;
  const task = isTaskTemplate(rawTemplate, effectiveBlockId);

  const mappedFields = rawTemplate.fields.map((field: TemplateField) => {
    const semantic = getTemplateFieldSemantic(field);
    if (semantic === 'goalPath') return { ...field, options: goalFieldOptions };
    if (task && ['select', 'singleSelect', 'radio'].includes(field.type) && field.options?.length) {
      return { ...field, autoSelectFirst: true };
    }
    return field;
  }).filter(Boolean) as TemplateField[];

  return {
    ...rawTemplate,
    recordTypeId: effectiveBlockId || rawTemplate.recordTypeId,
    fields: task ? normalizeTaskFields(mappedFields, options.taskTimingMode ?? 'plan', options.recordInputMode ?? 'create') : mappedFields,
  };
}

export function shouldShowQuickInputTimeDirectionControl(
  template: QuickInputTemplateLike | null | undefined,
): boolean {
  if (!template?.fields) return false;
  const keys = new Set((template.fields || []).map((field: TemplateField) => field.key || field.label));
  const hasLegacyTriple = keys.has('时间') && keys.has('结束') && keys.has('时长');
  const hasTaskTriple = keys.has('startAt') && keys.has('endAt') && keys.has('expectedDurationMinutes');
  return hasLegacyTriple || hasTaskTriple;
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
