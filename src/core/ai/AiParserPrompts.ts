import type { AiParserSnapshot } from './AiParserSnapshot';

/** Goal-only parser prompt: Goal path + CoreBlock + optional one GoalTemplate. */
export function buildAiSystemPrompt(snapshot: AiParserSnapshot, customPrompt: string): string {
  const blockExamples = (snapshot.blocks ?? []).slice(0, 5).map((b) => `${b.id}(${b.name})`).join(', ');
  const goalExamples = (snapshot.goals ?? []).slice(0, 8).map((g) => g.path).filter(Boolean).join(', ');
  const presetExamples = (snapshot.goalPresets ?? []).slice(0, 10)
    .map((p) => `${p.goalPath} × ${p.blockId || p.categoryKey}`)
    .join('；');

  const lines = [
    'You convert natural language into Think plugin record commands.',
    'Return ONLY valid JSON. No markdown and no explanations.',
    '',
    'Schema:',
    '{"items":[{"rawText":"...","target":{"blockId":"core.task","categoryKey":"optional","goalPath":"完整/目标/路径","goalTemplateId":"optional"},"fieldValues":{},"meta":{"confidence":0.9}}]}',
    '',
    `Blocks: ${blockExamples}`,
    `Goals: ${goalExamples}`,
    `Configured Goal templates: ${presetExamples}`,
    '',
    'Rules:',
    '1. Goal has one identity: target.goalPath. Use a complete path from the provided Goal list.',
    '2. blockId is required and must come from the provided Blocks.',
    '3. A Goal x blockId has at most one configured template. When one exists, goalTemplateId may identify it; there is no template variant.',
    '4. Record classification uses target.goalPath only. Put no system identity fields inside fieldValues.',
    '5. Goal path is the only Goal identity; do not invent secondary identity fields.',
    '6. fieldValues contains only user-editable record fields, never Goal/template/period context.',
    '7. Dates use YYYY-MM-DD; times use HH:mm. Do not invent fields not present in the selected template/block.',
  ];

  if (customPrompt) lines.push('', 'User custom rules, highest priority:', customPrompt);
  return lines.join('\n');
}

export function buildAiFastSystemPrompt(customPrompt: string): string {
  const lines = [
    'Convert user text into Think record commands. Return compact JSON only.',
    'Schema: {"items":[{"rawText":"...","target":{"blockId":"core.task","categoryKey":"optional","goalPath":"...","goalTemplateId":"optional"},"fieldValues":{},"meta":{"confidence":0.9}}]}',
    'Use only supplied Goal paths, Block IDs and editable fields.',
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
    'Blocks:',
    JSON.stringify(snapshot.blocks || [], null, 2),
    '',
    'User input:',
    text,
    '',
    'Return target.goalPath + target.blockId and optional target.goalTemplateId. Put only editable fields in fieldValues.',
  ].join('\n');
}

export function buildAiFastUserPrompt(text: string, nowIso: string, maxResults: number, snapshot: AiParserSnapshot): string {
  const goals = (snapshot.goals ?? []).map((goal) => goal.path).filter(Boolean);
  const presets = (snapshot.goalPresets ?? []).map((preset) => ({
    goalPath: preset.goalPath,
    blockId: preset.blockId,
    categoryKey: preset.categoryKey,
    goalTemplateId: preset.goalTemplateId || preset.id,
  }));
  const blocks = (snapshot.blocks ?? []).map((block) => ({
    id: block.id,
    categoryKey: block.categoryKey,
    fields: (block.fields ?? []).map((field) => field.key || field.label).filter(Boolean),
  }));
  return [
    `Current time: ${nowIso}`,
    `Max results: ${maxResults}`,
    `Goals: ${goals.join(' | ')}`,
    `Goal templates: ${JSON.stringify(presets)}`,
    `Blocks: ${JSON.stringify(blocks)}`,
    `User input: ${text}`,
    'Return compact JSON with goalPath, blockId, optional goalTemplateId, and editable fieldValues only.',
  ].join('\n');
}
