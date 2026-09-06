import type { RecordCaptureTemplate } from '@/core/recordInput/CaptureTemplate';
import type { RecordOutputPlan, RecordPersistencePlan } from '@/core/types/recordSnapshot';
import { renderTemplate } from '@/core/utils/templateUtils';
import { normalizeTemplateRenderData } from '@/core/fields/TemplateFieldAdapter';
import { requireGoalPath, resolveDerivedPeriod, resolveTemplatePeriodPolicy } from '@/core/goal';
import { readOptionText } from '@/core/semantics/option';
import { createRecordId } from '@/core/records/RecordId';
import { encodeRecordBlock, encodeRecordDraft } from '@/core/records/codec';
import { buildCustomCaptureFields, buildGenericRecordDraft } from '@/core/records/RecordDraft';
import { getRecordSchemaDefinition } from '@/core/records/schema';
import { splitHierarchyPathValue } from '@/core/semantics/path';
import { buildTimelineCompletedExecutionPersistence, isTimelineCompletedExecutionContext } from '@/core/records/task/taskExecutionCapture';
import { buildTaskSessionFields } from '@/core/records/task/taskSession';

function normalizeNonEmptyPath(value: string | null | undefined): string | null {
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

function readScalarOption(value: unknown): string {
  const option = readOptionText(value);
  return String(option.value || option.label || value || '').trim();
}

function normalizeLocalDateTime(value: unknown): string | undefined {
  const text = readScalarOption(value);
  if (!text) return undefined;
  const normalized = text.replace(' ', 'T');
  const parsed = new Date(normalized);
  return Number.isFinite(parsed.getTime()) ? normalized : undefined;
}

function localDatePart(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return undefined;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function durationMinutesBetween(start: string | undefined, end: string | undefined): number | undefined {
  if (!start || !end) return undefined;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return undefined;
  return Math.max(1, Math.round((endMs - startMs) / 60000));
}

function readStructuredTaskRecurrence(renderData: Record<string, unknown>): { unit: 'day' | 'week' | 'month' | 'quarter' | 'year'; interval: number; anchor: 'scheduled' | 'start' | 'due' | 'completion' } | null {
  const rawUnit = readScalarOption(renderData['重复'] ?? renderData['重复单位'] ?? renderData.recurrenceUnit).toLowerCase();
  if (!rawUnit || rawUnit === 'none') return null;
  if (!['day', 'week', 'month', 'quarter', 'year'].includes(rawUnit)) throw new Error(`task_recurrence_unit_invalid:${rawUnit}`);
  const interval = Number(renderData['重复间隔'] ?? renderData.recurrenceInterval ?? 1);
  if (!Number.isInteger(interval) || interval < 1) throw new Error(`task_recurrence_interval_invalid:${interval}`);
  const rawAnchor = readScalarOption(renderData['重复锚点'] ?? renderData.recurrenceAnchor ?? 'scheduled').toLowerCase();
  if (!['scheduled', 'start', 'due', 'completion'].includes(rawAnchor)) throw new Error(`task_recurrence_anchor_invalid:${rawAnchor}`);
  return { unit: rawUnit as any, interval, anchor: rawAnchor as any };
}


function buildRenderData(
  template: RecordCaptureTemplate,
  formData: Record<string, unknown>,
): Record<string, unknown> {
  const normalizedData = normalizeTemplateRenderData(template, formData);
  const categoryPartsValue = splitHierarchyPathValue(normalizedData.categoryKey ?? normalizedData.categoryPath ?? template.categoryKey ?? null);
  const categoryPath = categoryPartsValue.path || '';
  const categoryParts = categoryPartsValue.parts;
  const rawGoalPath = String(normalizedData.goalPath ?? normalizedData['目标'] ?? '').trim();
  const goalPath = rawGoalPath ? requireGoalPath(rawGoalPath) : '';
  const goalParts = goalPath ? goalPath.split('/').filter(Boolean) : [];
  const coreBlock = String(normalizedData.coreBlock ?? normalizedData['记录类型'] ?? (template as any).recordTypeId ?? template.id ?? '').trim();
  const recordDate = String(normalizedData['日期'] ?? normalizedData.date ?? '').trim();
  const periodPolicy = resolveTemplatePeriodPolicy(template as any);
  const derivedPeriod = periodPolicy ? resolveDerivedPeriod(recordDate || undefined, periodPolicy.granularity) : null;
  const cycleId = derivedPeriod ? String(normalizedData.cycleId ?? normalizedData['周期ID'] ?? derivedPeriod.id ?? '').trim() : '';
  const cycleTitle = derivedPeriod ? String(normalizedData.period ?? normalizedData['周期'] ?? derivedPeriod.label ?? '').trim() : '';

  return {
    ...normalizedData,
    block: { name: template.name, id: template.id, categoryKey: categoryPath || template.categoryKey },
    categoryKey: categoryPath,
    categoryPath,
    baseCategory: categoryParts[0] || '',
    rootCategory: categoryParts[0] || '',
    leafCategory: categoryParts.length ? categoryParts[categoryParts.length - 1] : '',
    goal: {
      title: goalParts.length ? goalParts[goalParts.length - 1] : goalPath,
      path: goalPath,
      root: goalParts[0] || '',
      leaf: goalParts.length ? goalParts[goalParts.length - 1] : '',
    },
    goalPath,
    rootGoal: goalParts[0] || '',
    leafGoal: goalParts.length ? goalParts[goalParts.length - 1] : '',
    coreBlock,
    period: derivedPeriod ? { ...derivedPeriod, id: cycleId || derivedPeriod.id, label: cycleTitle || derivedPeriod.label } : null,
    cycle: derivedPeriod ? { ...derivedPeriod, id: cycleId || derivedPeriod.id, title: cycleTitle || derivedPeriod.label } : null,
    cycleId: derivedPeriod ? cycleId || derivedPeriod.id : '',
    cycleTitle: derivedPeriod ? cycleTitle || derivedPeriod.label : '',
    periodId: derivedPeriod ? cycleId || derivedPeriod.id : '',
    periodLabel: derivedPeriod ? cycleTitle || derivedPeriod.label : '',
    '周期粒度': derivedPeriod ? derivedPeriod.granularity : '',
    '周期ID': derivedPeriod ? cycleId || derivedPeriod.id : '',
    '周期': derivedPeriod ? cycleTitle || derivedPeriod.label : '',
  };
}

/**
 * 计划第 7 步：显式计算当前编辑态会写到哪里。
 *
 * 之前的安全 MVP 对路径变化一律阻止，实测太保守。
 * 现在改为“安全迁移保存”：路径变化时生成 move_and_replace 计划，
 * 上层执行时必须先写入新位置，再删除旧位置；删除失败不能回滚新记录，
 * 但必须返回 partial_success 并提示用户手动清理旧记录。
 */
export function buildRecordOutputPlan(input: {
  template: RecordCaptureTemplate | null;
  formData: Record<string, unknown>;
  recordId?: string | null;
  context?: Record<string, unknown> | null;
}): RecordOutputPlan {
  if (!input.template) {
    return {
      recordId: null,
      coreBlock: null,
      targetFilePath: null,
      targetHeader: null,
      outputContent: '',
      renderData: {},
    };
  }

  const renderData = buildRenderData(input.template, input.formData);
  const explicitRecordTypeId = String((input.template as any).recordTypeId || '').trim();
  const systemRecordTypeId = String(input.template.id || '').trim().startsWith('core.') ? String(input.template.id || '').trim() : '';
  const trustedCoreBlock = (explicitRecordTypeId || systemRecordTypeId).replace(/^core\./, '');
  const hintedCoreBlock = String(renderData.coreBlock || input.template.id || '').trim().replace(/^core\./, '');
  const coreBlock = trustedCoreBlock || hintedCoreBlock;
  if (!coreBlock) throw new Error('每条记录都必须有记录类型。');
  const schema = getRecordSchemaDefinition(coreBlock);
  if (!schema) throw new Error(`unknown_record_schema:${coreBlock}`);
  const recordId = String(input.recordId || '').trim() || createRecordId(coreBlock);

  let outputContent: string;
  if (coreBlock === 'task') {
    const statusOption = readOptionText(renderData['状态'] ?? renderData.status);
    const candidateStatus = String(statusOption.value || statusOption.label || 'open').trim().toLowerCase();
    // A Timeline completed-execution invocation is authoritative. Force lifecycle
    // completion before recurrence/output branching so a stale template status cannot
    // create an open Task or accidentally arm a recurring series.
    const status = isTimelineCompletedExecutionContext(input.context)
      ? 'done'
      : (['open', 'done', 'cancelled', 'skipped'].includes(candidateStatus) ? candidateStatus : 'open');
    const requestedRecurrence = readStructuredTaskRecurrence(renderData);
    // Completed capture is an execution fact. A stale template/Goal recurrence
    // default must never turn that historical Task into the initial instance of
    // a series (the old combination caused task_series_initial_instance_must_be_open).
    const recurrence = status === 'done' ? null : requestedRecurrence;
    if (!recurrence && status === 'skipped') throw new Error('task_status_skipped_requires_series');
    if (recurrence && status !== 'open') throw new Error('task_series_initial_instance_must_be_open');
    const scheduledAt = normalizeLocalDateTime(
      renderData['计划时间'] ?? renderData.scheduledAt ?? renderData['计划日期'] ?? renderData.scheduledDate,
    );
    const dueAt = normalizeLocalDateTime(
      renderData['截止时间'] ?? renderData.dueAt ?? renderData['截止日期'] ?? renderData.dueDate,
    );
    const startAt = normalizeLocalDateTime(renderData['实际开始'] ?? renderData['开始时间'] ?? renderData['开始/预计时间'] ?? renderData.startAt);
    const endAt = normalizeLocalDateTime(renderData['实际结束'] ?? renderData['结束时间'] ?? renderData.endAt);
    const declaredDuration = renderData['预计时长（分钟）'] ?? renderData['时长（分钟）'] ?? renderData['时长'] ?? renderData['预计时长'] ?? renderData.expectedDurationMinutes;
    const capturedAt = new Date().toISOString();
    const taskFields = {
      status,
      content: renderData['任务内容'] ?? renderData['内容'] ?? renderData.content,
      goalPath: renderData.goalPath,
      priority: renderData['优先级'] ?? renderData.priority,
      importance: renderData['重要程度'] ?? renderData.importance,
      urgency: renderData['紧急程度'] ?? renderData.urgency,
      energyDemand: renderData['精力要求'] ?? renderData.energyDemand,
      brainDemand: renderData['脑力要求'] ?? renderData.brainDemand,
      physicalDemand: renderData['体力要求'] ?? renderData.physicalDemand,
      availabilityContexts: renderData['可用场景'] ?? renderData.availabilityContexts,
      recoveryIntent: renderData['恢复意图'] ?? renderData.recoveryIntent,
      scheduledAt,
      dueAt,
      startAt,
      endAt,
      expectedDurationMinutes: declaredDuration || durationMinutesBetween(startAt, endAt),
      createdAt: renderData['创建于'] ?? renderData.createdAt ?? capturedAt,
      // A completed Task with an explicit endAt is historical execution data.
      // Use that end as the completion fact unless the user supplied completedAt;
      // falling back to capture time is only appropriate when no execution end exists.
      completedAt: status === 'done' ? (renderData['完成于'] ?? renderData.completedAt ?? endAt ?? capturedAt) : undefined,
      cancelledAt: status === 'cancelled' ? (renderData['取消于'] ?? renderData.cancelledAt) : undefined,
      skippedAt: status === 'skipped' ? (renderData['跳过于'] ?? renderData.skippedAt) : undefined,
      seriesId: renderData.seriesId ?? renderData['系列ID'],
    } as Record<string, unknown>;
    const customTaskFields = buildCustomCaptureFields('task', renderData, input.template.fields);
    for (const key of [
      '重复', '重复单位', '重复间隔', '重复锚点',
      'recurrenceUnit', 'recurrenceInterval', 'recurrenceAnchor',
      '计划时间', '计划日期', '截止时间', '截止日期',
      'scheduledAt', 'scheduledDate', 'dueAt', 'dueDate',
    ]) delete customTaskFields[key];
    Object.assign(taskFields, customTaskFields);
    const existingSeriesId = String(taskFields.seriesId || '').trim();
    if (recurrence && existingSeriesId) {
      throw new Error('task_series_recurrence_edit_requires_series_command');
    }
    if (recurrence && !existingSeriesId) {
      const seriesId = createRecordId('task-series');
      taskFields.seriesId = seriesId;
      const seriesStartDate = String(
        localDatePart(String(taskFields.scheduledAt || ''))
        || localDatePart(String(taskFields.startAt || ''))
        || localDatePart(String(taskFields.dueAt || ''))
        || new Date().toISOString().slice(0, 10)
      );
      const seriesBlock = encodeRecordBlock({
        recordId: seriesId,
        coreBlock: 'task-series',
        fields: {
          status: 'active',
          content: taskFields.content,
          goalPath: taskFields.goalPath,
          priority: taskFields.priority,
          importance: taskFields.importance,
          urgency: taskFields.urgency,
          expectedDurationMinutes: taskFields.expectedDurationMinutes,
          energyDemand: taskFields.energyDemand,
          brainDemand: taskFields.brainDemand,
          physicalDemand: taskFields.physicalDemand,
          availabilityContexts: taskFields.availabilityContexts,
          recoveryIntent: taskFields.recoveryIntent,
          recurrenceUnit: recurrence.unit,
          recurrenceInterval: recurrence.interval,
          recurrenceAnchor: recurrence.anchor,
          seriesStartDate,
          currentTaskId: recordId,
        },
      });
      const taskBlock = encodeRecordBlock({ recordId, coreBlock: 'task', fields: taskFields });
      outputContent = `${seriesBlock}\n\n${taskBlock}`;
    } else {
      const timelineExecution = buildTimelineCompletedExecutionPersistence({
        context: input.context,
        taskFields,
      });
      const taskBlock = encodeRecordBlock({ recordId, coreBlock: 'task', fields: timelineExecution.taskFields });
      if (!timelineExecution.session) {
        outputContent = taskBlock;
      } else {
        const sessionId = createRecordId('task-session');
        const sessionBlock = encodeRecordBlock({
          recordId: sessionId,
          coreBlock: 'task-session',
          fields: buildTaskSessionFields({
            id: recordId,
            seriesId: existingSeriesId || undefined,
            goalPath: String(taskFields.goalPath || '').trim() || undefined,
          }, timelineExecution.session),
        });
        outputContent = `${taskBlock}\n\n${sessionBlock}`;
      }
    }
  } else if (schema?.family === 'generic') {
    const draft = buildGenericRecordDraft(schema.coreBlock, renderData, input.template.fields);
    outputContent = encodeRecordDraft({ recordId, draft });
  } else {
    throw new Error(`record_capture_not_supported:${schema.coreBlock}:${schema.captureMode}`);
  }
  const targetFilePath = normalizeNonEmptyPath(renderTemplate(input.template.targetFile, renderData));
  const targetHeader = input.template.appendUnderHeader
    ? normalizeNonEmptyPath(renderTemplate(input.template.appendUnderHeader, renderData))
    : null;

  return {
    recordId,
    coreBlock,
    targetFilePath,
    targetHeader,
    outputContent,
    renderData,
  };
}

export function buildRecordPersistencePlan(input: {
  mode: 'create' | 'edit';
  originalPath?: string | null;
  outputPlan: RecordOutputPlan;
}): RecordPersistencePlan {
  const originalPath = normalizeNonEmptyPath(input.originalPath);
  const targetPath = normalizeNonEmptyPath(input.outputPlan.targetFilePath);

  if (input.mode === 'create') {
    return {
      originalPath: null,
      pathChanged: false,
      writeMode: 'create',
    };
  }

  const pathChanged = !!originalPath && !!targetPath && originalPath !== targetPath;
  return {
    originalPath,
    pathChanged,
    writeMode: pathChanged ? 'move_and_replace' : 'update_in_place',
  };
}
