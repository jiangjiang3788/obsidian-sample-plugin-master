import type { BlockTemplate, ThemeDefinition } from '@/core/types/schema';
import type { RecordOutputPlan, RecordPersistencePlan } from '@/core/types/recordSnapshot';
import { splitThemePath } from '@/core/types/recordSnapshot';
import { renderTemplate } from '@/core/utils/templateUtils';

function normalizePath(value: string | null | undefined): string | null {
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

function buildRenderData(
  template: BlockTemplate,
  formData: Record<string, unknown>,
  theme?: ThemeDefinition | null,
  templateMeta?: { templateId?: string | null; templateSourceType?: 'block' | 'override' | null },
): Record<string, unknown> {
  const normalizedData: Record<string, unknown> = { ...formData };
  const themeParts = splitThemePath(theme?.path ?? null);

  for (const field of template.fields || []) {
    const raw = normalizedData[field.key] as any;
    if (!raw || typeof raw !== 'object') continue;

    const hasLabel = Object.prototype.hasOwnProperty.call(raw, 'label');
    const hasValue = Object.prototype.hasOwnProperty.call(raw, 'value');
    if (!hasLabel && !hasValue) continue;

    if (field.semanticType === 'ratingPair') {
      normalizedData[field.key] = { label: raw.label, value: raw.value };
      const auxKey = field.auxKey || '评图';
      if (raw.value !== undefined) normalizedData[auxKey] = raw.value;
    } else if (field.semanticType === 'path' || ['select', 'radio'].includes(field.type)) {
      normalizedData[field.key] = { label: raw.label, value: raw.value };
    }
  }

  return {
    ...normalizedData,
    block: { name: template.name, id: template.id, categoryKey: template.categoryKey },
    theme: theme ? { path: themeParts.themePath, root: themeParts.rootTheme, leaf: themeParts.leafTheme, icon: theme.icon || '' } : { path: null, root: null, leaf: null },
    themePath: themeParts.themePath,
    rootTheme: themeParts.rootTheme,
    leafTheme: themeParts.leafTheme,
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
  templateMeta?: { templateId?: string | null; templateSourceType?: 'block' | 'override' | null };
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
