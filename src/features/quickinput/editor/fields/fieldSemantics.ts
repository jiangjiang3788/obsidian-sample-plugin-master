import type { TemplateField } from '@core/types/public';
import { getTemplateFieldSemantic } from '@core/fields/public';
import { isSystemRecordContextField } from '@core/goal/public';

export function isQuickInputSystemContextField(field: TemplateField): boolean {
  return isSystemRecordContextField(field.key, field.label, String(getTemplateFieldSemantic(field) || ''));
}

export function isQuickInputInlineRowField(field: TemplateField): boolean {
  const semantic = getTemplateFieldSemantic(field);
  const label = field.label || field.key;
  return semantic === 'status' || semantic === 'recurrence' || semantic === 'date' || semantic === 'duration' || label === '状态' || label === '重复' || label === '日期';
}

export function isQuickInputTimeField(field: TemplateField): boolean {
  const semantic = getTemplateFieldSemantic(field);
  return semantic === 'startTime' || semantic === 'endTime' || semantic === 'duration' || ['时间', '结束', '时长'].includes(field.label || field.key);
}

export function getQuickInputFieldValue(formData: Record<string, unknown>, field: TemplateField) {
  const rawValue = formData[field.key];
  const value = typeof rawValue === 'object' && rawValue !== null && !Array.isArray(rawValue)
    ? (rawValue as Record<string, unknown>).value
    : rawValue;
  return { rawValue, value };
}

export function groupQuickInputFields(fields: TemplateField[] = []) {
  const regularFields: TemplateField[] = [];
  const dateFields: TemplateField[] = [];
  const timeFields: TemplateField[] = [];

  fields.forEach((field) => {
    if (isQuickInputSystemContextField(field)) return;
    const semantic = getTemplateFieldSemantic(field);
    if (semantic === 'date') dateFields.push(field);
    else if (semantic === 'startTime' || semantic === 'endTime' || semantic === 'duration') timeFields.push(field);
    else regularFields.push(field);
  });

  return { regularFields, dateFields, timeFields };
}

export function sortQuickInputTimeFields(fields: TemplateField[]) {
  const order: Record<string, number> = { startTime: 0, endTime: 1, duration: 2 };
  return [...fields].sort((left, right) => (order[getTemplateFieldSemantic(left)] ?? 99) - (order[getTemplateFieldSemantic(right)] ?? 99));
}
