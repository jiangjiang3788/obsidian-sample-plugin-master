/** @jsxImportSource preact */
import { h } from 'preact';

import { getTemplateFieldInputType, isTemplateImageField, isTemplatePathField, isTemplateTagField } from '@core/fields/public';

import { QuickInputHierarchyFieldRenderer } from './HierarchyFieldRenderer';
import { QuickInputImageFieldRenderer } from './ImageFieldRenderer';
import {
  QuickInputMultiSelectFieldRenderer,
  QuickInputRadioFieldRenderer,
  QuickInputSingleSelectFieldRenderer,
} from './OptionFieldRenderer';
import { QuickInputRatingFieldRenderer } from './RatingFieldRenderer';
import { QuickInputTagFieldRenderer } from './TagFieldRenderer';
import { QuickInputNativeFieldRenderer, QuickInputTextAreaValueFieldRenderer } from './TextFieldRenderer';
import { getQuickInputFieldValue } from './fieldSemantics';
import type { QuickInputFieldRendererProps } from './types';

export function QuickInputFieldRenderer(props: QuickInputFieldRendererProps) {
  const { field, formData } = props;
  const inputType = getTemplateFieldInputType(field);
  const { rawValue, value } = getQuickInputFieldValue(formData, field);
  const label = field.label || field.key;
  const displayProps = {
    ...props,
    label,
    displayLabel: field.required ? `${label} *` : label,
    rawValue,
    value,
  };

  if (inputType === 'multiSelect') return <QuickInputMultiSelectFieldRenderer {...displayProps} />;
  if (isTemplateTagField(field)) return <QuickInputTagFieldRenderer {...displayProps} />;
  if (inputType === 'multiPath' || inputType === 'multiImage') return <QuickInputTextAreaValueFieldRenderer {...displayProps} />;
  if (isTemplateImageField(field)) return <QuickInputImageFieldRenderer {...displayProps} />;

  switch (inputType) {
    case 'rating':
      return <QuickInputRatingFieldRenderer {...displayProps} />;
    case 'radio':
      return <QuickInputRadioFieldRenderer {...displayProps} />;
    case 'hierarchicalSingleSelect':
      return <QuickInputHierarchyFieldRenderer {...displayProps} />;
    case 'select':
    case 'singleSelect':
    case 'path':
      return <QuickInputSingleSelectFieldRenderer {...displayProps} />;
    default:
      return <QuickInputNativeFieldRenderer {...displayProps} field={{ ...field, type: isTemplatePathField(field) ? 'path' : field.type }} />;
  }
}
