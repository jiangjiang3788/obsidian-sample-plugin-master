import type { TemplateField } from '@core/types/public';

export type GoalTemplateEditMode = 'inherit' | 'override' | 'disabled';

export interface GoalTemplateDraftState {
  variantId: string;
  name: string;
  description: string;
  granularity: 'week' | 'month' | 'quarter' | 'year';
  sortOrder: number;
  fields: TemplateField[];
  outputTemplate: string;
  targetFile: string;
  appendUnderHeader: string;
  requiredFields: string[];
  defaultValues: Record<string, unknown>;
  themePath: string;
}

export interface GoalTemplateThemeOption {
  value: string;
  label: string;
}

export const presetGranularityOptions: GoalTemplateThemeOption[] = [
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'quarter', label: '季度' },
  { value: 'year', label: '年' },
];
