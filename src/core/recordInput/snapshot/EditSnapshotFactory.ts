import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { EditableRecordSnapshot } from '@/core/types/recordSnapshot';
import { buildParsedRecordSnapshot } from '@/core/types/recordSnapshot';
import { buildRecordOutputPlan, buildRecordPersistencePlan } from './OutputPlanner';

/**
 * Build the canonical editable snapshot shared by create/edit flows.
 * UI form state stays separate from persistence planning.
 */
export function buildEditableRecordSnapshot(input: {
  mode: 'create' | 'edit';
  item?: RecordViewItem | null;
  blockId: string | null;
  fields: Record<string, unknown>;
  template: any;
}): EditableRecordSnapshot {
  const parsed = input.item ? buildParsedRecordSnapshot(input.item) : null;
  const outputPlan = buildRecordOutputPlan({
    template: input.template ?? null,
    formData: input.fields,
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
    fields: { ...input.fields },
    outputPlan,
    persistencePlan,
  };
}
