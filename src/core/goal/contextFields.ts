/** Non-editable Record context in the Goal-only model. */
export const SYSTEM_RECORD_CONTEXT_FIELD_KEYS = [
  'goalPath', '目标', '目标路径', 'rootGoal', 'leafGoal',
  'coreBlock', 'recordTypeId', '记录类型',
  'templateId', '模板ID', 'templateSourceType', '模板来源',
  'cycleId', '周期ID', 'periodId', 'period', '周期', '周期粒度', 'goalGranularity',
] as const;

const KEY_SET = new Set<string>(SYSTEM_RECORD_CONTEXT_FIELD_KEYS);
const SEMANTIC_SET = new Set<string>([
  'goalPath', 'coreBlock', 'templateId', 'templateSourceType', 'cycleId', 'period',
]);

export function isSystemRecordContextField(
  key?: string | null,
  label?: string | null,
  semantic?: string | null,
): boolean {
  const normalizedKey = String(key || '').trim();
  const normalizedLabel = String(label || '').trim();
  const normalizedSemantic = String(semantic || '').trim();
  return KEY_SET.has(normalizedKey)
    || KEY_SET.has(normalizedLabel)
    || SEMANTIC_SET.has(normalizedSemantic);
}
