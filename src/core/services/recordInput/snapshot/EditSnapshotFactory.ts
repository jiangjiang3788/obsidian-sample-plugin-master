import type { Item } from '@/core/types/schema';
import type { EditableRecordSnapshot } from '@/core/types/recordSnapshot';
import { buildParsedRecordSnapshot } from '@/core/types/recordSnapshot';
import { buildRecordOutputPlan, buildRecordPersistencePlan } from './OutputPlanner';

/**
 * 计划第 5 步：兼容式重构里先让 prepareEdit/prepareCreate 能返回 snapshot，
 * 旧 UI 还可以继续用 initialFormData，但后续路径检测/迁移保存会统一依赖 snapshot。
 */
export function buildEditableRecordSnapshot(input: {
  mode: 'create' | 'edit';
  item?: Item | null;
  blockId: string | null;
  themeId: string | null;
  fields: Record<string, unknown>;
  template: any;
  theme: any;
  templateMeta?: { templateId?: string | null; templateSourceType?: 'block' | 'override' | null };
}): EditableRecordSnapshot {
  const parsed = input.item ? buildParsedRecordSnapshot(input.item) : null;
  const outputPlan = buildRecordOutputPlan({
    template: input.template ?? null,
    formData: input.fields,
    theme: input.theme ?? null,
    templateMeta: input.templateMeta,
  });
  const persistencePlan = buildRecordPersistencePlan({
    mode: input.mode,
    originalPath: parsed?.locator.path ?? null,
    outputPlan,
  });

  return {
    mode: input.mode,
    parsed,
    blockId: input.blockId,
    themeId: input.themeId,
    fields: { ...input.fields },
    outputPlan,
    persistencePlan,
    themeParts: outputPlan.themeParts,
  };
}
