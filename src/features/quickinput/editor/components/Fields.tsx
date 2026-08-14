/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';

import { getTemplateFieldSemantic } from '@core/fields/public';
import { ThinkDisclosure } from '@shared/ui/public';

import { QuickInputFieldRenderer } from '../fields/FieldRenderer';
import { QuickInputTimeFieldsSection } from '../fields/TimeFieldsSection';
import { groupQuickInputFields, isQuickInputSystemContextField } from '../fields/fieldSemantics';
import type { QuickInputFieldValueOptions } from '../fields/types';

export interface QuickInputEditorFieldsProps {
  getResourcePath: (path: string) => string;
  template: { fields?: unknown[]; coreBlockId?: string; id?: string } | null | undefined;
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

function scalarValue(value: unknown): string {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const option = value as Record<string, unknown>;
    return String(option.value ?? option.label ?? '').trim().toLowerCase();
  }
  return String(value ?? '').trim().toLowerCase();
}

const TASK_PRIMARY_ORDER = ['status', 'body', 'recurrence', 'start', 'end', 'duration'] as const;
type TaskPrimarySlot = typeof TASK_PRIMARY_ORDER[number];

function taskPrimarySlot(field: any): TaskPrimarySlot | null {
  const semantic = getTemplateFieldSemantic(field);
  const key = String(field?.key || field?.label || '');
  if (semantic === 'status' || key === 'status' || key === '状态') return 'status';
  if (semantic === 'body') return 'body';
  if (semantic === 'recurrence' || key === 'recurrenceUnit' || key === '重复') return 'recurrence';
  if (key === 'startAt' || key === '开始/预计时间' || key === '开始时间') return 'start';
  if (key === 'endAt' || key === '结束时间') return 'end';
  if (semantic === 'duration' || key === 'expectedDurationMinutes' || key === '预计时长' || key === '时长' || key === '时长（分钟）') return 'duration';
  return null;
}

function taskPrimaryRank(field: any): number {
  const slot = taskPrimarySlot(field);
  return slot ? TASK_PRIMARY_ORDER.indexOf(slot) : 99;
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const fields = (template?.fields || []) as any[];
  const isTaskTemplate = String(template?.coreBlockId || template?.id || '').replace(/^core\./, '') === 'task';

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

  if (isTaskTemplate) {
    const taskFields = fields.filter((field) => !isQuickInputSystemContextField(field));
    const recurrenceUnit = scalarValue(formData.recurrenceUnit ?? formData['重复']);
    const repeats = !!recurrenceUnit && recurrenceUnit !== 'none';

    const primaryFields = taskFields
      .filter((field) => taskPrimaryRank(field) < 99)
      .sort((left, right) => taskPrimaryRank(left) - taskPrimaryRank(right));
    const recurrenceDetailFields = repeats
      ? taskFields.filter((field) => ['recurrenceInterval', '重复间隔'].includes(String(field?.key || field?.label || '')))
      : [];
    const excluded = new Set([...primaryFields, ...recurrenceDetailFields]);
    const advancedFields = taskFields.filter((field) => {
      if (excluded.has(field)) return false;
      return !['recurrenceInterval', '重复间隔'].includes(String(field?.key || field?.label || ''));
    });

    return (
      <div className={`think-qif-fields-stack${dense ? ' is-dense' : ''}`}>
        {primaryFields.map((field) => (
          <div key={field.id} className="think-qif-fields-stack__item">
            <QuickInputFieldRenderer field={field} {...rendererProps} />
          </div>
        ))}
        {recurrenceDetailFields.map((field) => (
          <div key={field.id} className="think-qif-fields-stack__item think-qif-recurrence-detail">
            <QuickInputFieldRenderer field={field} {...rendererProps} />
          </div>
        ))}
        {advancedFields.length ? (
          <ThinkDisclosure
            title="更多选项"
            className="think-qif-advanced-disclosure"
            open={advancedOpen}
            onOpenChange={setAdvancedOpen}
          >
            <div className={`think-qif-fields-stack${dense ? ' is-dense' : ''}`}>
              {advancedFields.map((field) => (
                <div key={field.id} className="think-qif-fields-stack__item">
                  <QuickInputFieldRenderer field={field} {...rendererProps} />
                </div>
              ))}
            </div>
          </ThinkDisclosure>
        ) : null}
      </div>
    );
  }

  const visibleFields = fields.filter((field) => !isQuickInputSystemContextField(field));
  const { regularFields, dateFields, timeFields } = groupQuickInputFields(visibleFields);

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
