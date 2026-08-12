import type { RecordCaptureTemplate } from '@/core/recordInput/CaptureTemplate';
import type { ThemeDefinition } from '@/core/theme/ThemeDefinition';
import type { RecordOutputPlan, RecordPersistencePlan } from '@/core/types/recordSnapshot';
import { splitThemePath } from '@/core/types/recordSnapshot';
import { renderTemplate } from '@/core/utils/templateUtils';
import { normalizeTemplateRenderData } from '@/core/fields/TemplateFieldAdapter';
import { resolveDerivedPeriod, resolveTemplatePeriodPolicy } from '@/core/goal';
import { readOptionText } from '@/core/semantics/option';
import { createRecordId, RECORD_SCHEMA_VERSION } from '@/core/records/RecordId';
import { encodeRecordBlock, encodeRecordDraft } from '@/core/records/codec';
import { buildCustomCaptureFields, buildGenericRecordDraft } from '@/core/records/RecordDraft';
import { getRecordSchemaDefinition } from '@/core/records/schema';
import { splitHierarchyPathValue } from '@/core/semantics/path';

function normalizeNonEmptyPath(value: string | null | undefined): string | null {
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

function readScalarOption(value: unknown): string {
  const option = readOptionText(value);
  return String(option.value || option.label || value || '').trim();
}

function readStructuredTaskRecurrence(renderData: Record<string, unknown>): { unit: 'day' | 'week' | 'month' | 'quarter' | 'year'; interval: number; anchor: 'scheduled' | 'start' | 'due' | 'completion' } | null {
  const rawUnit = readScalarOption(renderData['重复单位'] ?? renderData.recurrenceUnit).toLowerCase();
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
  theme?: ThemeDefinition | null,
  templateMeta?: { templateId?: string | null; templateSourceType?: 'core-block' | 'goal-template' | null },
): Record<string, unknown> {
  const normalizedData = normalizeTemplateRenderData(template, formData);
  const normalizedTheme = normalizedData.theme && typeof normalizedData.theme === 'object' ? normalizedData.theme as Record<string, unknown> : null;
  const explicitThemePath = String(normalizedData.themePath ?? normalizedTheme?.path ?? '').trim();
  const themeParts = splitThemePath(explicitThemePath || theme?.path || null);
  const categoryPartsValue = splitHierarchyPathValue(normalizedData.categoryKey ?? normalizedData.categoryPath ?? template.categoryKey ?? null);
  const categoryPath = categoryPartsValue.path || '';
  const categoryParts = categoryPartsValue.parts;
  const explicitGoalValue = Array.isArray(normalizedData.goalPaths) ? normalizedData.goalPaths[0] : (normalizedData.goalPath ?? normalizedData['目标']);
  const goalPartsValue = splitHierarchyPathValue(explicitGoalValue, { stripLeadingHashes: true });
  const goalPath = goalPartsValue.path || '';
  const goalParts = goalPartsValue.parts;
  const goalId = String(normalizedData.goalId ?? normalizedData['目标ID'] ?? '').trim();
  const coreBlock = String(normalizedData.coreBlock ?? normalizedData['核心Block'] ?? (template as any).coreBlockId ?? template.id ?? '').trim();
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
    theme: {
      ...(normalizedTheme || {}),
      path: themeParts.themePath,
      root: themeParts.rootTheme,
      leaf: themeParts.leafTheme,
      icon: theme?.icon || String(normalizedData.icon ?? normalizedData['图标'] ?? normalizedTheme?.icon ?? ''),
    },
    themePath: themeParts.themePath,
    rootTheme: themeParts.rootTheme,
    leafTheme: themeParts.leafTheme,
    goal: {
      id: goalId,
      title: goalParts.length ? goalParts[goalParts.length - 1] : goalPath,
      path: goalPath,
      root: goalParts[0] || '',
      leaf: goalParts.length ? goalParts[goalParts.length - 1] : '',
      themePath: themeParts.themePath,
    },
    goalId,
    goalPath,
    goalPaths: goalPath ? [goalPath] : (normalizedData.goalPaths || []),
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
    templateId: templateMeta?.templateId || template.id,
    templateSourceType: templateMeta?.templateSourceType || 'core-block',
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
  theme?: ThemeDefinition | null;
  templateMeta?: { templateId?: string | null; templateSourceType?: 'core-block' | 'goal-template' | null };
  recordId?: string | null;
}): RecordOutputPlan {
  if (!input.template) {
    return {
      recordId: null,
      schemaVersion: null,
      coreBlock: null,
      targetFilePath: null,
      targetHeader: null,
      outputContent: '',
      renderData: {},
      themeParts: splitThemePath(null),
    };
  }

  const renderData = buildRenderData(input.template, input.formData, input.theme, input.templateMeta);
  const explicitCoreBlockId = String((input.template as any).coreBlockId || '').trim();
  const systemCoreBlockId = String(input.template.id || '').trim().startsWith('core.') ? String(input.template.id || '').trim() : '';
  const trustedCoreBlock = (explicitCoreBlockId || systemCoreBlockId).replace(/^core\./, '');
  const hintedCoreBlock = String(renderData.coreBlock || input.template.id || '').trim().replace(/^core\./, '');
  const coreBlock = trustedCoreBlock || hintedCoreBlock;
  if (!coreBlock) throw new Error('Record Foundation v2 要求每条记录都有核心Block。');
  const schema = getRecordSchemaDefinition(coreBlock);
  if (!schema) throw new Error(`unknown_record_schema:${coreBlock}`);
  const recordId = String(input.recordId || '').trim() || createRecordId(coreBlock);

  let outputContent: string;
  if (coreBlock === 'task') {
    const statusOption = readOptionText(renderData['状态'] ?? renderData.status);
    const candidateStatus = String(statusOption.value || statusOption.label || 'open').trim().toLowerCase();
    const status = ['open', 'done', 'cancelled', 'skipped'].includes(candidateStatus) ? candidateStatus : 'open';
    const recurrence = readStructuredTaskRecurrence(renderData);
    if (!recurrence && status === 'skipped') throw new Error('task_status_skipped_requires_series');
    if (recurrence && status !== 'open') throw new Error('task_series_initial_instance_must_be_open');
    const taskFields = {
      status,
      content: renderData['任务内容'] ?? renderData['内容'] ?? renderData.content,
      goalId: renderData.goalId,
      goalPath: renderData.goalPath,
      themePath: renderData.themePath,
      priority: renderData['优先级'] ?? renderData.priority,
      energyDemand: renderData['精力要求'] ?? renderData.energyDemand,
      brainDemand: renderData['脑力要求'] ?? renderData.brainDemand,
      physicalDemand: renderData['体力要求'] ?? renderData.physicalDemand,
      scheduledDate: renderData['计划日期'] ?? renderData.scheduledDate ?? renderData['日期'] ?? renderData.date,
      startDate: renderData['开始日期'] ?? renderData.startDate,
      dueDate: renderData['截止日期'] ?? renderData.dueDate,
      expectedDurationMinutes: renderData['预计时长'] ?? renderData.expectedDurationMinutes,
      createdAt: renderData['创建于'] ?? renderData.createdAt ?? new Date().toISOString(),
      seriesId: renderData.seriesId ?? renderData['系列ID'],
    } as Record<string, unknown>;
    Object.assign(taskFields, buildCustomCaptureFields('task', renderData, input.template.fields));
    const existingSeriesId = String(taskFields.seriesId || '').trim();
    if (recurrence && existingSeriesId) {
      throw new Error('task_series_recurrence_edit_requires_series_command');
    }
    if (recurrence && !existingSeriesId) {
      const seriesId = createRecordId('task-series');
      taskFields.seriesId = seriesId;
      const seriesStartDate = String(taskFields.scheduledDate || taskFields.startDate || taskFields.dueDate || new Date().toISOString().slice(0, 10));
      const seriesBlock = encodeRecordBlock({
        recordId: seriesId,
        schemaVersion: RECORD_SCHEMA_VERSION,
        coreBlock: 'task-series',
        fields: {
          status: 'active',
          content: taskFields.content,
          goalId: taskFields.goalId,
          goalPath: taskFields.goalPath,
          themePath: taskFields.themePath,
          priority: taskFields.priority,
          expectedDurationMinutes: taskFields.expectedDurationMinutes,
          energyDemand: taskFields.energyDemand,
          brainDemand: taskFields.brainDemand,
          physicalDemand: taskFields.physicalDemand,
          recurrenceUnit: recurrence.unit,
          recurrenceInterval: recurrence.interval,
          recurrenceAnchor: recurrence.anchor,
          seriesStartDate,
          currentTaskId: recordId,
        },
      });
      const taskBlock = encodeRecordBlock({ recordId, schemaVersion: RECORD_SCHEMA_VERSION, coreBlock: 'task', fields: taskFields });
      outputContent = `${seriesBlock}\n\n${taskBlock}`;
    } else {
      outputContent = encodeRecordBlock({ recordId, schemaVersion: RECORD_SCHEMA_VERSION, coreBlock: 'task', fields: taskFields });
    }
  } else if (schema?.family === 'generic') {
    const draft = buildGenericRecordDraft(schema.coreBlock, renderData, input.template.fields);
    outputContent = encodeRecordDraft({ recordId, schemaVersion: RECORD_SCHEMA_VERSION, draft });
  } else {
    throw new Error(`record_capture_not_supported:${schema.coreBlock}:${schema.captureMode}`);
  }
  const targetFilePath = normalizeNonEmptyPath(renderTemplate(input.template.targetFile, renderData));
  const targetHeader = input.template.appendUnderHeader
    ? normalizeNonEmptyPath(renderTemplate(input.template.appendUnderHeader, renderData))
    : null;

  return {
    recordId,
    schemaVersion: RECORD_SCHEMA_VERSION,
    coreBlock,
    targetFilePath,
    targetHeader,
    outputContent,
    renderData,
    themeParts: splitThemePath(input.theme?.path ?? null),
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
