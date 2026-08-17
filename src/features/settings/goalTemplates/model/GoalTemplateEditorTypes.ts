import type { TemplateField } from '@core/types/public';

export type GoalTemplateEditMode = 'inherit' | 'override' | 'disabled';

export interface GoalTemplateDraftState {
  description: string;
  granularity: 'week' | 'month' | 'quarter' | 'year';
  fields: TemplateField[];
  targetFile: string;
  appendUnderHeader: string;
  requiredFields: string[];
  defaultValues: Record<string, unknown>;
}

export interface GoalTemplateSelectOption {
  value: string;
  label: string;
}

export const presetGranularityOptions: GoalTemplateSelectOption[] = [
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'quarter', label: '季度' },
  { value: 'year', label: '年' },
];
