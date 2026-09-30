import type { AiParserSnapshot } from './AiParserSnapshot';

/** Same business constraints for normal and fast mode; fast mode only reduces verbosity. */
const TASK_CAPTURE_RULES = [
  'For every core.task item, explicitly output fieldValues.status using canonical values, normally open or done; never output a display label as the value.',
  'Already finished (已经完成/做完了/完成了) means done. Future plans (明天完成/准备做), negation (还没完成/没做完), partial progress and merely stopping work mean open. Classify each item from its own exact source text, not another item in the batch.',
  'A completed Task is different from a work block ending. Do not claim the entire Task is complete merely because a timer or a work period ended.',
  'For done tasks, use startAt/endAt for explicit actual execution times and completedAt for an explicit completion time. For plans, use scheduledAt/dueAt and expectedDurationMinutes. Do not turn actual time into a planned duration.',
  'The task execution fields startAt, endAt and completedAt are supported by the completed-Task capture flow. Omit unknown times; do not fabricate a duration or use capture time as a historical event time.',
  'This entry point creates records; it cannot match or update an existing task. Do not claim that an existing task has been updated.',
  'Keep rawText as the verbatim source fragment for each item; keep uncertainty in meta.reason. Do not guess the first Goal or template when several match.',
];

/** Include the caller/device timezone when interpreting 今天/昨天 and local clock times. */
export function formatAiLocalNow(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const offset = -now.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const absoluteOffset = Math.abs(offset);
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    + `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    + `${sign}${pad(Math.floor(absoluteOffset / 60))}:${pad(absoluteOffset % 60)}`;
}

/** Goal-only parser prompt: Goal path + RecordType + optional one GoalTemplate. */
export function buildAiSystemPrompt(snapshot: AiParserSnapshot, customPrompt: string): string {
  const recordTypeExamples = (snapshot.recordTypes ?? []).slice(0, 5).map((recordType) => `${recordType.id}(${recordType.name})`).join(', ');
  const goalExamples = (snapshot.goals ?? []).slice(0, 8).map((g) => g.path).filter(Boolean).join(', ');
  const presetExamples = (snapshot.goalPresets ?? []).slice(0, 10)
    .map((p) => `${p.goalPath} × ${p.recordTypeId || '未指定记录类型'}`)
    .join('；');

  const lines = [
    'You convert natural language into Think plugin record commands.',
    'Return ONLY valid JSON. No markdown and no explanations.',
    '',
    'Schema:',
    '{"items":[{"rawText":"...","target":{"recordTypeId":"core.task","goalPath":"完整/目标/路径","goalTemplateId":"optional"},"fieldValues":{},"meta":{"confidence":0.9}}]}',
    '',
    `Record Types: ${recordTypeExamples}`,
    `Goals: ${goalExamples}`,
    `Configured Goal templates: ${presetExamples}`,
    '',
    'Rules:',
    '1. Goal has one identity: target.goalPath. Use a complete path from the provided Goal list.',
    '2. recordTypeId is required and must come from the provided Record Types.',
    '3. A Goal x recordTypeId has at most one configured template. When one exists, goalTemplateId may identify it; there is no template variant.',
    '4. Record classification uses target.goalPath only. Put no system identity fields inside fieldValues.',
    '5. Goal path is the only Goal identity; do not invent secondary identity fields.',
    '6. fieldValues contains only user-editable record fields, never Goal/template/period context.',
    '7. Dates use YYYY-MM-DD; times use HH:mm; datetime fields use YYYY-MM-DDTHH:mm. Interpret relative dates in the supplied current-time timezone. Do not invent unsupported fields.',
    ...TASK_CAPTURE_RULES,
  ];

  if (customPrompt) lines.push('', 'User custom rules, highest priority:', customPrompt);
  return lines.join('\n');
}

export function buildAiFastSystemPrompt(customPrompt: string): string {
  const lines = [
    'Convert user text into Think record commands. Return compact JSON only.',
    'Schema: {"items":[{"rawText":"...","target":{"recordTypeId":"core.task","goalPath":"...","goalTemplateId":"optional"},"fieldValues":{},"meta":{"confidence":0.9}}]}',
    'Use only supplied Goal paths, Record Type IDs and editable fields.',
    'Put no classification aliases, template variants, or system context inside fieldValues.',
    'Interpret relative dates in the supplied current-time timezone. datetime fields use YYYY-MM-DDTHH:mm.',
    ...TASK_CAPTURE_RULES,
  ];
  if (customPrompt) lines.push('', 'User custom rules:', customPrompt);
  return lines.join('\n');
}

export function buildAiUserPrompt(text: string, nowIso: string, maxResults: number, snapshot: AiParserSnapshot): string {
  return [
    `Current time: ${nowIso}`,
    `Max results: ${maxResults}`,
    '',
    'Goals:',
    JSON.stringify(snapshot.goals || [], null, 2),
    '',
    'Goal templates:',
    JSON.stringify(snapshot.goalPresets || [], null, 2),
    '',
    'Record Types:',
    JSON.stringify(snapshot.recordTypes || [], null, 2),
    '',
    'User input:',
    text,
    '',
    'Return target.goalPath + target.recordTypeId and optional target.goalTemplateId. Put only editable fields in fieldValues.',
  ].join('\n');
}

export function buildAiFastUserPrompt(text: string, nowIso: string, maxResults: number, snapshot: AiParserSnapshot): string {
  const goals = (snapshot.goals ?? []).map((goal) => goal.path).filter(Boolean);
  const presets = (snapshot.goalPresets ?? []).map((preset) => ({
    goalPath: preset.goalPath,
    recordTypeId: preset.recordTypeId,
    goalTemplateId: preset.goalTemplateId || preset.id,
    fields: preset.fields,
  }));
  const recordTypes = (snapshot.recordTypes ?? []).map((recordType) => ({
    id: recordType.id,
    name: recordType.name,
    fields: (recordType.fields ?? []).map((field) => ({ key: field.key, label: field.label, type: field.type, options: field.options })),
  }));
  return [
    `Current time: ${nowIso}`,
    `Max results: ${maxResults}`,
    `Goals: ${goals.join(' | ')}`,
    `Goal templates: ${JSON.stringify(presets)}`,
    `Record Types: ${JSON.stringify(recordTypes)}`,
    `User input: ${text}`,
    'Return compact JSON with goalPath, recordTypeId, optional goalTemplateId, and editable fieldValues only.',
  ].join('\n');
}
