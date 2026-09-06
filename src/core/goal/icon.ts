import type { TemplateField } from '@/core/recordInput/CaptureTemplate';
import { isIconTemplateField } from '@/core/fields/fieldTokenSemantics';
import type { GoalDefinition } from './types';

/** Canonical Goal identity icon. GoalTemplate must never own a competing icon default. */
export function normalizeGoalIcon(value: unknown): string {
  return String(value ?? '').trim();
}

export function resolveGoalIcon(goal?: Pick<GoalDefinition, 'icon'> | null): string {
  return normalizeGoalIcon(goal?.icon);
}

export function resolveRecordDisplayIcon(
  record: Record<string, unknown> | null | undefined,
  goal?: Pick<GoalDefinition, 'icon'> | null,
): string {
  const own = normalizeGoalIcon(record?.icon ?? record?.['图标']);
  return own || resolveGoalIcon(goal);
}

/** Drop legacy GoalTemplate icon defaults while preserving every other default. */
export function stripGoalTemplateIconDefaults(
  values?: Record<string, unknown> | null,
): Record<string, unknown> | undefined {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values || {})) {
    if (key === 'icon' || key === '图标') continue;
    result[key] = value;
  }
  return Object.keys(result).length ? result : undefined;
}

/** Keep the icon field itself, but remove a per-template icon default from it. */
export function stripGoalTemplateIconFieldDefaults(
  fields?: TemplateField[] | null,
): TemplateField[] | undefined {
  if (!fields?.length) return undefined;
  return fields.map((field) => {
    if (!isIconTemplateField(field)) return field;
    const next = { ...(field as any) };
    delete next.defaultValue;
    return next as TemplateField;
  });
}

/**
 * Record capture templates may expose an icon field, but its default visual
 * identity comes from Goal.icon. Record types without an icon field stay unchanged.
 */
export function applyGoalIconToCaptureFields(
  fields: TemplateField[] | undefined,
  goal?: Pick<GoalDefinition, 'icon'> | null,
): TemplateField[] | undefined {
  const icon = resolveGoalIcon(goal);
  if (!fields?.length || !icon) return fields;
  return fields.map((field) => (
    isIconTemplateField(field)
      ? ({ ...(field as any), defaultValue: icon } as TemplateField)
      : field
  ));
}
