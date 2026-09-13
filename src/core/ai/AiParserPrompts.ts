import type { AiParserSnapshot } from './AiParserSnapshot';

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
    '7. Dates use YYYY-MM-DD; times use HH:mm. Do not invent fields not present in the selected template/Record Type.',
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
  }));
  const recordTypes = (snapshot.recordTypes ?? []).map((recordType) => ({
    id: recordType.id,
    fields: (recordType.fields ?? []).map((field) => field.key || field.label).filter(Boolean),
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
