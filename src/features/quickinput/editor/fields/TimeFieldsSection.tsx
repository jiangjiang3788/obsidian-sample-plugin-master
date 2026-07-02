/** @jsxImportSource preact */
import { h } from 'preact';

import type { TemplateField } from '@core/types/public';

import { QuickInputFieldRenderer } from './FieldRenderer';
import { sortQuickInputTimeFields } from './fieldSemantics';
import type { QuickInputFieldRendererProps } from './types';

interface TimeFieldsSectionProps extends Omit<QuickInputFieldRendererProps, 'field'> {
  timeFields: TemplateField[];
  timeDirection: 'forward' | 'backward';
  onTimeDirectionChange?: (direction: 'forward' | 'backward') => void;
  showTimeDirectionControl?: boolean;
}

export function QuickInputTimeFieldsSection({
  timeFields,
  timeDirection,
  onTimeDirectionChange,
  showTimeDirectionControl = false,
  ...rendererProps
}: TimeFieldsSectionProps) {
  if (!timeFields.length) return null;
  const sortedTimeFields = sortQuickInputTimeFields(timeFields);
  return (
    <div className="think-qif-time-section">
      <div className="think-form-row think-qif-time-grid">
        {sortedTimeFields.map((field) => (
          <div key={field.id}>
            <QuickInputFieldRenderer field={field} {...rendererProps} />
          </div>
        ))}
      </div>
      {showTimeDirectionControl && (
        <div className="think-qif-time-direction">
          <label className="think-qif-time-direction__label">
            <input
              type="checkbox"
              checked={timeDirection === 'backward'}
              onChange={(event) => onTimeDirectionChange?.((event.currentTarget as HTMLInputElement).checked ? 'backward' : 'forward')}
            />
            反向（结束 - 时长 = 时间）
          </label>
        </div>
      )}
    </div>
  );
}
