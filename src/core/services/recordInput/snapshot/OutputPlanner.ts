import type { BlockTemplate, ThemeDefinition } from '@/core/types/schema';
import type { RecordOutputPlan, RecordPersistencePlan } from '@/core/types/recordSnapshot';
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
    theme: theme ? { path: theme.path, icon: theme.icon || '' } : {},
    templateId: templateMeta?.templateId || template.id,
    templateSourceType: templateMeta?.templateSourceType || 'block',
  };
}

/**
 * 计划第 5 步：显式计算当前编辑态会写到哪里，
 * 第 6.5 步：编辑保存遇到路径变化时，
 * 不再只是拦截，而是进入安全迁移保存（先写新位置，再删旧位置）。
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
