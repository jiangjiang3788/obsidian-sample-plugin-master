import type { TemplateField } from '@core/types/public';
import type { QuickInputChoice } from '../components/quickInputOptionSelection';

export type QuickInputFieldValueOptions = Record<string, Array<{ value: string; label?: string; icon?: string }>>;

export type QuickInputFieldUpdate = (key: string, value: unknown, isOptionObject?: boolean) => void;

export interface QuickInputFieldChoice extends QuickInputChoice {
  icon?: string;
}

export interface QuickInputFieldRendererBaseProps {
  field: TemplateField;
  label: string;
  displayLabel: string;
  value: unknown;
  rawValue: unknown;
  dense: boolean;
  isMobileLike: boolean;
  onUpdate: QuickInputFieldUpdate;
  onRequestSubmit?: () => void;
}

export interface QuickInputFieldRendererProps extends Omit<QuickInputFieldRendererBaseProps, 'label' | 'displayLabel' | 'value' | 'rawValue'> {
  formData: Record<string, unknown>;
  fieldValueOptionsByKey?: QuickInputFieldValueOptions;
  getResourcePath: (path: string) => string;
  tagDrafts: Record<string, string>;
  onTagDraftsChange: (drafts: Record<string, string>) => void;
}
