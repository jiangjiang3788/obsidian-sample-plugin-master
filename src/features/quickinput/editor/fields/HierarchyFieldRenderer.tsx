/** @jsxImportSource preact */
import { h } from 'preact';

import { getTemplateFieldSemantic } from '@core/fields/public';
import { HierarchySingleSelect, type HierarchySingleSelectOption } from '../components/HierarchySingleSelect';

import { QuickInputFieldFrame } from './FieldFrame';
import { getQuickInputFieldChoices } from './fieldChoices';
import type { QuickInputFieldRendererBaseProps, QuickInputFieldValueOptions } from './types';

interface HierarchyFieldRendererProps extends QuickInputFieldRendererBaseProps {
  fieldValueOptionsByKey?: QuickInputFieldValueOptions;
}

function getSelectedPathValue(value: unknown): string {
  if (typeof value !== 'object' || value === null) return String(value ?? '');
  const record = value as Record<string, unknown>;
  return String(record.value ?? record.label ?? '');
}

export function QuickInputHierarchyFieldRenderer({
  field,
  value,
  dense,
  fieldValueOptionsByKey,
  onUpdate,
}: HierarchyFieldRendererProps) {
  const choices = getQuickInputFieldChoices(field, fieldValueOptionsByKey);
  const selectedValue = getSelectedPathValue(value);
  const options: HierarchySingleSelectOption[] = choices.map((choice) => ({
    id: String(choice.value),
    value: String(choice.value),
    label: choice.label || String(choice.value).split('/').pop() || String(choice.value),
    icon: choice.icon,
  }));

  const control = options.length ? (
    <HierarchySingleSelect
      options={options}
      selectedValue={selectedValue}
      onSelect={(option) => onUpdate(field.key, option?.value || '')}
      parentLabel={getTemplateFieldSemantic(field) === 'themePath' ? '父主题' : '父级'}
      childLabel={getTemplateFieldSemantic(field) === 'themePath' ? '子主题' : '子级'}
      dense={dense}
      allowClear
      searchable
    />
  ) : (
    <input
      className="think-native-input"
      value={selectedValue}
      onInput={(event) => onUpdate(field.key, (event.currentTarget as HTMLInputElement).value)}
      placeholder="例如：生活/健康"
    />
  );

  return (
    <QuickInputFieldFrame label={field.label || field.key} required={field.required}>
      {control}
    </QuickInputFieldFrame>
  );
}
