/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';

import { QuickInputFieldRenderer } from '../fields/FieldRenderer';
import { QuickInputTimeFieldsSection } from '../fields/TimeFieldsSection';
import { groupQuickInputFields } from '../fields/fieldSemantics';
import type { QuickInputFieldValueOptions } from '../fields/types';

// Domain gate: system context filtering is delegated to fieldSemantics, which uses isSystemRecordContextField.

export interface QuickInputEditorFieldsProps {
  getResourcePath: (path: string) => string;
  template: { fields?: unknown[] } | null | undefined;
  formData: Record<string, unknown>;
  fieldValueOptionsByKey?: QuickInputFieldValueOptions;
  dense?: boolean;
  onUpdateField: (key: string, value: unknown, isOptionObject?: boolean) => void;
  timeDirection?: 'forward' | 'backward';
  onTimeDirectionChange?: (direction: 'forward' | 'backward') => void;
  onRequestSubmit?: () => void;
  isMobileLike?: boolean;
  showTimeDirectionControl?: boolean;
}

export function QuickInputEditorFields({
  getResourcePath,
  template,
  formData,
  fieldValueOptionsByKey,
  dense = false,
  onUpdateField,
  timeDirection = 'forward',
  onTimeDirectionChange,
  onRequestSubmit,
  isMobileLike = false,
  showTimeDirectionControl = false,
}: QuickInputEditorFieldsProps) {
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({});
  const fields = (template?.fields || []) as any[];
  const { regularFields, dateFields, timeFields } = groupQuickInputFields(fields);
  const rendererProps = {
    getResourcePath,
    formData,
    fieldValueOptionsByKey,
    dense,
    onUpdate: onUpdateField,
    onRequestSubmit,
    isMobileLike,
    tagDrafts,
    onTagDraftsChange: setTagDrafts,
  };

  return (
    <div className={`think-qif-fields-stack${dense ? ' is-dense' : ''}`}>
      {regularFields.map((field) => (
        <div key={field.id} className="think-qif-fields-stack__item">
          <QuickInputFieldRenderer field={field} {...rendererProps} />
        </div>
      ))}
      {dateFields.map((field) => (
        <div key={field.id} className="think-qif-fields-stack__item">
          <QuickInputFieldRenderer field={field} {...rendererProps} />
        </div>
      ))}
      <QuickInputTimeFieldsSection
        timeFields={timeFields}
        timeDirection={timeDirection}
        onTimeDirectionChange={onTimeDirectionChange}
        showTimeDirectionControl={showTimeDirectionControl}
        {...rendererProps}
      />
    </div>
  );
}
