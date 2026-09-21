import type { RecordSubmitIssue, RecordValidationResult, ValidateRecordInputParams } from '@/core/types/recordInput';
import { templateFieldValueToString } from '@/core/fields/FieldBehavior';
import { getRecordTypeById } from '@/core/recordTypes/public';

function issue(code: string, message: string, field?: string): RecordSubmitIssue {
  return { code, message, field };
}


function isTaskOptionalDurationField(template: ValidateRecordInputParams['template'], field: { key?: string; label?: string; semantic?: string }): boolean {
  const recordTypeId = String(template?.recordTypeId || template?.id || '').trim().replace(/^core\./, '');
  if (recordTypeId !== 'task') return false;
  const key = String(field.key || '').trim();
  const label = String(field.label || '').trim();
  return field.semantic === 'duration'
    || key === 'expectedDurationMinutes'
    || ['预计时长', '时长', '时长（分钟）'].includes(key)
    || ['预计时长', '时长', '时长（分钟）'].includes(label);
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
    errors.push(issue('record_template_missing', '当前记录没有可用模板。'));
    return { ok: false, errors, warnings };
  }

  if (!input.template.targetFile || !String(input.template.targetFile).trim()) {
    errors.push(issue('record_target_file_missing', '所选模板没有定义目标文件。', 'targetFile'));
  }

  const recordType = getRecordTypeById(input.template.recordTypeId || input.template.id);
  if (recordType?.capabilities.goalBindable) {
    const goalPath = input.formData.goalPath ?? input.formData['目标'];
    if (!hasRequiredValue(goalPath)) {
      errors.push(issue('record_goal_required', '请选择目标。', '目标'));
    }
  }

  if ((input.mode === 'edit' || input.mode === 'delete') && !input.item) {
    errors.push(issue('record_item_missing', '当前操作缺少目标记录。'));
  }

  for (const field of input.template.fields || []) {
    const rawValue = input.formData[field.key] ?? input.formData[field.label || ''];
    const hasValue = hasRequiredValue(rawValue);

    // Required-field validation belongs to the domain submit boundary, not only
    // to QuickInput UI helpers. AI/batch/API callers can bypass the editor UI,
    // so keeping this invariant here prevents incomplete records from being
    // persisted silently.
    if (field.required && !hasValue && !isTaskOptionalDurationField(input.template, field)) {
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
        errors.push(issue('record_field_invalid_number', '此字段需要填写数字。', field.key));
        continue;
      }
      if (typeof field.min === 'number' && numericValue < field.min) {
        errors.push(issue('record_field_min_violation', `此字段必须大于或等于 ${field.min}。`, field.key));
      }
      if (typeof field.max === 'number' && numericValue > field.max) {
        errors.push(issue('record_field_max_violation', `此字段必须小于或等于 ${field.max}。`, field.key));
      }
    }

    if (['select', 'radio', 'rating'].includes(field.type) && Array.isArray(field.options) && field.options.length > 0) {
      const valueToCheck = templateFieldValueToString(rawValue);
      const matched = field.options.some((option) => String(option.value) === valueToCheck || String(option.label) === valueToCheck);
      if (!matched) {
        warnings.push(issue('record_field_option_unmatched', '当前值与已配置的选项都不匹配。', field.key));
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
