import type { TemplateField, ThemeDefinition } from '@core/types/public';
import { getTemplateFieldSemantic } from '@core/fields/public';

import { themeOptions } from '../quickInputPathModel';
import type { QuickInputPeriodLike, QuickInputFormData, QuickInputTemplateLike } from './types';

export function buildQuickInputDisplayTemplate(
  rawTemplate: QuickInputTemplateLike | null | undefined,
  effectiveBlockId: string | null | undefined,
  availableThemes: ThemeDefinition[],
  goalFieldOptions: Array<{ value: string; label: string }>,
): QuickInputTemplateLike | null {
  if (!rawTemplate?.fields?.length) return rawTemplate ?? null;
  const themeFieldOptions = themeOptions(availableThemes);
  return {
    ...rawTemplate,
    coreBlockId: effectiveBlockId || rawTemplate.coreBlockId,
    fields: rawTemplate.fields.map((field: TemplateField) => {
      const semantic = getTemplateFieldSemantic(field);
      if (semantic === 'goalPath') return { ...field, options: goalFieldOptions };
      if (semantic === 'themePath') {
        return {
          ...field,
          type: field.type === 'path' ? 'hierarchicalSingleSelect' : field.type,
          options: themeFieldOptions,
        };
      }
      return field;
    }),
  };
}

export function shouldShowQuickInputTimeDirectionControl(
  template: QuickInputTemplateLike | null | undefined,
): boolean {
  if (!template?.fields) return false;
  const keys = new Set((template.fields || []).map((field: TemplateField) => field.key || field.label));
  return keys.has('时间') && keys.has('结束') && keys.has('时长');
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
