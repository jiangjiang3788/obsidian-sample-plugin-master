import type { RecordSubmitIssue, RecordValidationResult, ValidateRecordInputParams } from '@/core/types/recordInput';

function issue(code: string, message: string, field?: string): RecordSubmitIssue {
  return { code, message, field };
}

function isOptionObject(value: unknown): value is { value?: unknown; label?: unknown } {
  return !!value && typeof value === 'object' && ('value' in value || 'label' in value);
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

  if ((input.mode === 'edit' || input.mode === 'delete') && !input.item) {
    errors.push(issue('record_item_missing', 'The target record is missing for this operation.'));
  }

  for (const field of input.template.fields || []) {
    const rawValue = input.formData[field.key];
    if (rawValue === undefined || rawValue === null || rawValue === '') continue;

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
      const valueToCheck = isOptionObject(rawValue) ? rawValue.value : rawValue;
      const matched = field.options.some((option) => String(option.value) === String(valueToCheck) || String(option.label) === String(valueToCheck));
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
