/**
 * FieldManager - compact field selection for Settings.
 */

import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { SimpleSelect } from './SimpleSelect';

export interface FieldManagerProps {
  fields: string[];
  availableFields: string[];
  onFieldsChange: (fields: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxFields?: number;
  className?: string;
  getFieldLabel?: (field: string) => string;
  getFieldGroupLabel?: (field: string) => string;
}

export function FieldManager({
  fields,
  availableFields,
  onFieldsChange,
  placeholder = '+ 添加字段…',
  disabled = false,
  maxFields,
  className = '',
  getFieldLabel = (field: string) => field,
  getFieldGroupLabel,
}: FieldManagerProps) {
  const availableOptions = useMemo(() => (
    availableFields
      .filter((field) => !fields.includes(field))
      .map((field) => ({
        value: field,
        label: getFieldLabel(field),
        group: getFieldGroupLabel?.(field),
      }))
  ), [availableFields, fields, getFieldLabel, getFieldGroupLabel]);

  const handleAddField = (field: string) => {
    if (!field) return;
    if (maxFields !== undefined && fields.length >= maxFields) return;
    onFieldsChange([...fields, field]);
  };

  const handleRemoveField = (field: string) => {
    if (disabled) return;
    onFieldsChange(fields.filter((item) => item !== field));
  };

  const canAddMore = !disabled && (maxFields === undefined || fields.length < maxFields);
  const hasAvailableFields = availableOptions.length > 0;
  const rootClass = ['think-field-manager', className].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      {fields.length > 0 && (
        <div className="think-field-manager__tags">
          {fields.map((field) => (
            <button
              key={field}
              type="button"
              className="think-field-manager__tag"
              onClick={() => handleRemoveField(field)}
              disabled={disabled}
              title={`移除 ${getFieldLabel(field)}`}
            >
              <span>{getFieldLabel(field)}</span>
              <span className="think-field-manager__tag-remove" aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}

      {canAddMore && hasAvailableFields && (
        <SimpleSelect
          placeholder={placeholder}
          value=""
          options={availableOptions}
          onChange={handleAddField}
          fullWidth
          className="think-field-manager__select"
        />
      )}

      {canAddMore && !hasAvailableFields && (
        <span className="think-field-manager__status">已添加全部可用字段</span>
      )}

      {maxFields !== undefined && fields.length >= maxFields && (
        <span className="think-field-manager__status">最多 {maxFields} 个字段</span>
      )}
    </div>
  );
}
