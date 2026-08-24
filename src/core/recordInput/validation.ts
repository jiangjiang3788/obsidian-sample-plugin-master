import type { RecordSubmitIssue, RecordValidationResult, ValidateRecordInputParams } from '@/core/types/recordInput';
import { templateFieldValueToString } from '@/core/fields/FieldBehavior';
import { getRecordTypeById } from '@/core/recordTypes/public';

function issue(code: string, message: string, field?: string): RecordSubmitIssue {
  return { code, message, field };
}

function hasRequiredValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.some((entry) => hasRequiredValue(entry));
  return templateFieldValueToString(value).trim() !== '';
}

export function validateRecordInput(input: ValidateRecordInputParams): RecordValidationResult {
  const errors: RecordSubmitIssue[] = [];
  const warnings: RecordSubmitIssue[] = [];

  if (!input.template) {
    errors.push(issue('record_template_missing', 'No effective template is available for this record.'));
    return { ok: false, errors, warnings };
  }

  if (!input.template.targetFile || !String(input.template.targetFile).trim()) {
    errors.push(issue('record_target_file_missing', 'The selected template does not define a target file.', 'targetFile'));
  }

  const recordType = getRecordTypeById(input.template.recordTypeId || input.template.id);
  if (recordType?.capabilities.goalBindable) {
    const goalPath = input.formData.goalPath ?? input.formData['目标'];
    if (!hasRequiredValue(goalPath)) {
      errors.push(issue('record_goal_required', '请选择目标。', '目标'));
    }
  }

  if ((input.mode === 'edit' || input.mode === 'delete') && !input.item) {
    errors.push(issue('record_item_missing', 'The target record is missing for this operation.'));
  }

  for (const field of input.template.fields || []) {
    const rawValue = input.formData[field.key] ?? input.formData[field.label || ''];
    const hasValue = hasRequiredValue(rawValue);

    // Required-field validation belongs to the domain submit boundary, not only
    // to QuickInput UI helpers. AI/batch/API callers can bypass the editor UI,
    // so keeping this invariant here prevents incomplete records from being
    // persisted silently.
    if (field.required && !hasValue) {
      errors.push(issue(
        'record_field_required',
        `请填写必填字段：${field.label || field.key}`,
        field.key,
      ));
      continue;
    }

    if (!hasValue) continue;

    if (field.type === 'number') {
      const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);
      if (Number.isNaN(numericValue)) {
        errors.push(issue('record_field_invalid_number', 'This field expects a numeric value.', field.key));
        continue;
      }
      if (typeof field.min === 'number' && numericValue < field.min) {
        errors.push(issue('record_field_min_violation', `This field must be >= ${field.min}.`, field.key));
      }
      if (typeof field.max === 'number' && numericValue > field.max) {
        errors.push(issue('record_field_max_violation', `This field must be <= ${field.max}.`, field.key));
      }
    }

    if (['select', 'radio', 'rating'].includes(field.type) && Array.isArray(field.options) && field.options.length > 0) {
      const valueToCheck = templateFieldValueToString(rawValue);
      const matched = field.options.some((option) => String(option.value) === valueToCheck || String(option.label) === valueToCheck);
      if (!matched) {
        warnings.push(issue('record_field_option_unmatched', 'The current value does not match any configured option.', field.key));
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
