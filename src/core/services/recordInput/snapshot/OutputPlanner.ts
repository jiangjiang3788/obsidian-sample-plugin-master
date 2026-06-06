import type { BlockTemplate, ThemeDefinition } from '@/core/types/schema';
import type { RecordOutputPlan, RecordPersistencePlan } from '@/core/types/recordSnapshot';
import { splitThemePath } from '@/core/types/recordSnapshot';
import { renderTemplate } from '@/core/utils/templateUtils';
import { normalizeTemplateRenderData } from '@/core/fields/TemplateFieldAdapter';

function normalizePath(value: string | null | undefined): string | null {
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

function buildRenderData(
  template: BlockTemplate,
  formData: Record<string, unknown>,
  theme?: ThemeDefinition | null,
  templateMeta?: { templateId?: string | null; templateSourceType?: 'block' | 'override' | 'core-block' | 'theme-fallback' | 'goal-binding' | 'legacy-block' | null },
): Record<string, unknown> {
  const normalizedData = normalizeTemplateRenderData(template, formData);
  const normalizedTheme = normalizedData.theme && typeof normalizedData.theme === 'object' ? normalizedData.theme as Record<string, unknown> : null;
  const explicitThemePath = String(normalizedData.themePath ?? normalizedTheme?.path ?? '').trim();
  const themeParts = splitThemePath(explicitThemePath || theme?.path || null);
  const categoryPath = String(normalizedData.categoryKey ?? normalizedData.categoryPath ?? template.categoryKey ?? '').trim();
  const categoryParts = categoryPath.split('/').map((part) => part.trim()).filter(Boolean);
  const explicitGoalPath = Array.isArray(normalizedData.goalPaths) ? String(normalizedData.goalPaths[0] ?? '').trim() : String(normalizedData.goalPath ?? normalizedData['目标'] ?? '').trim();
  const goalPath = explicitGoalPath;
  const goalParts = goalPath.split('/').map((part) => part.trim()).filter(Boolean);
  const goalId = String(normalizedData.goalId ?? normalizedData['目标ID'] ?? '').trim();
  const coreBlock = String(normalizedData.coreBlock ?? normalizedData['核心Block'] ?? (template as any).coreBlockId ?? template.id ?? '').trim();

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
      icon: theme?.icon || String(normalizedTheme?.icon ?? ''),
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
    templateId: templateMeta?.templateId || template.id,
    templateSourceType: templateMeta?.templateSourceType || 'block',
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
  templateMeta?: { templateId?: string | null; templateSourceType?: 'block' | 'override' | 'core-block' | 'theme-fallback' | 'goal-binding' | 'legacy-block' | null };
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
  const targetFilePath = normalizePath(renderTemplate(input.template.targetFile, renderData));
  const targetHeader = input.template.appendUnderHeader
    ? normalizePath(renderTemplate(input.template.appendUnderHeader, renderData))
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
  const originalPath = normalizePath(input.originalPath);
  const targetPath = normalizePath(input.outputPlan.targetFilePath);

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
