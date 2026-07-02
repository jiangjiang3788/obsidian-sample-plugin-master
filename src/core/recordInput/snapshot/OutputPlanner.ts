import type { BlockTemplate, ThemeDefinition } from '@/core/types/schema';
import type { RecordOutputPlan, RecordPersistencePlan } from '@/core/types/recordSnapshot';
import { splitThemePath } from '@/core/types/recordSnapshot';
import { renderTemplate } from '@/core/utils/templateUtils';
import { normalizeTemplateRenderData } from '@/core/fields/TemplateFieldAdapter';
import { resolveDerivedPeriod, resolveTemplatePeriodPolicy } from '@/core/goal';
import { readOptionText } from '@/core/semantics/option';
import { splitHierarchyPathValue } from '@/core/semantics/path';

function normalizeNonEmptyPath(value: string | null | undefined): string | null {
  const trimmed = String(value || '').trim();
  return trimmed || null;
}


function buildTaskRenderTokens(data: Record<string, unknown>): {
  taskStatusPrefix: string;
  taskStatusKind: 'todo' | 'done';
  taskDateToken: string;
  repeatToken: string;
} {
  const status = readOptionText(data['状态'] ?? data.status ?? data.taskStatus ?? data.taskStatusPrefix);
  const statusText = `${status.value} ${status.label}`.trim();
  const isDone = /-\s*\[x\]/i.test(status.value) || /完成|done|✅/.test(statusText);
  const taskStatusPrefix = isDone ? '- [x]' : '- [ ]';
  const taskStatusKind = isDone ? 'done' : 'todo';
  const date = String(data['日期'] ?? data.date ?? '').trim();
  const dateMarker = isDone
    ? '✅'
    : /🛫/.test(statusText)
      ? '🛫'
      : /⏳/.test(statusText)
        ? '⏳'
        : /➕/.test(statusText)
          ? '➕'
          : '📅';
  const repeat = readOptionText(data['重复'] ?? data.recurrence ?? data.repeat);
  const repeatText = repeat.value || repeat.label;
  return {
    taskStatusPrefix,
    taskStatusKind,
    taskDateToken: date ? `${dateMarker} ${date}` : '',
    repeatToken: repeatText && repeatText !== '不重复' ? repeatText : '',
  };
}

function buildRenderData(
  template: BlockTemplate,
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
  const taskTokens = buildTaskRenderTokens(normalizedData);

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
    cycle: derivedPeriod ? { id: cycleId || derivedPeriod.id, title: cycleTitle || derivedPeriod.label, ...derivedPeriod } : null,
    cycleId: derivedPeriod ? cycleId || derivedPeriod.id : '',
    cycleTitle: derivedPeriod ? cycleTitle || derivedPeriod.label : '',
    periodId: derivedPeriod ? cycleId || derivedPeriod.id : '',
    periodLabel: derivedPeriod ? cycleTitle || derivedPeriod.label : '',
    '周期粒度': derivedPeriod ? derivedPeriod.granularity : '',
    '周期ID': derivedPeriod ? cycleId || derivedPeriod.id : '',
    '周期': derivedPeriod ? cycleTitle || derivedPeriod.label : '',
    ...taskTokens,
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
  template: BlockTemplate | null;
  formData: Record<string, unknown>;
  theme?: ThemeDefinition | null;
  templateMeta?: { templateId?: string | null; templateSourceType?: 'core-block' | 'goal-template' | null };
}): RecordOutputPlan {
  if (!input.template) {
    return {
      targetFilePath: null,
      targetHeader: null,
      outputContent: '',
      renderData: {},
      themeParts: splitThemePath(null),
    };
  }

  const renderData = buildRenderData(input.template, input.formData, input.theme, input.templateMeta);
  const outputContent = renderTemplate(input.template.outputTemplate, renderData).trim();
  const targetFilePath = normalizeNonEmptyPath(renderTemplate(input.template.targetFile, renderData));
  const targetHeader = input.template.appendUnderHeader
    ? normalizeNonEmptyPath(renderTemplate(input.template.appendUnderHeader, renderData))
    : null;

  return {
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
