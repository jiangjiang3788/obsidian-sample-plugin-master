import type { AiParserSnapshot } from './AiParserSnapshot';

/** 构建系统提示 - 增强主题选择指导，支持自定义提示词。 */
export function buildAiSystemPrompt(snapshot: AiParserSnapshot, customPrompt: string): string {
    const themeExamples = (snapshot.themes ?? []).slice(0, 5).map((t) => t.path).join(', ') || '';
    const blockExamples = (snapshot.blocks ?? []).slice(0, 5).map((b) => `${b.id}(${b.name})`).join(', ') || '';
    const goalExamples = (snapshot.goals ?? []).slice(0, 6).map((g) => g.path).join(', ') || '';
    const presetExamples = (snapshot.goalPresets ?? []).slice(0, 8).map((p) => `${p.goalPath} × ${p.blockId || p.categoryKey} → ${p.name}${p.themePath ? `(${p.themePath})` : ''}`).join('；') || '';

    const basePrompt = [
        'You are a parser that converts natural language into Think plugin record commands.',
        'Return ONLY valid JSON. No markdown code blocks. No explanations. No extra text.',
        '',
        '=== OUTPUT SCHEMA ===',
        '{ "items": NaturalRecordCommand[] }',
        '',
        'NaturalRecordCommand structure:',
        '{',
        '  "rawText": "original input text",',
        '  "target": {',
        '    "blockId": "core-block-id-from-snapshot",',
        '    "categoryKey": "optional-category-label-from-snapshot",',
        '    "goalPath": "goal-path-from-snapshot",',
        '    "templateVariantId": "preset-variant-from-snapshot",',
        '    "themeId": "theme-path-from-selected-preset"',
        '  },',
        '  "fieldValues": { "fieldKey": "value" },',
        '  "meta": { "confidence": 0.9, "reason": "explanation" }',
        '}',
        '',
        '=== AVAILABLE BLOCKS ===',
        `Blocks: ${blockExamples}${(snapshot.blocks?.length ?? 0) > 5 ? '...' : ''}`,
        '',
        '=== AVAILABLE GOALS ===',
        `Goal paths: ${goalExamples}${(snapshot.goals?.length ?? 0) > 6 ? '...' : ''}`,
        '',
        '=== AVAILABLE GOAL PRESETS ===',
        `Goal presets: ${presetExamples}${(snapshot.goalPresets?.length ?? 0) > 8 ? '...' : ''}`,
        '',
        '=== AVAILABLE THEMES ===',
        `Theme paths: ${themeExamples}${(snapshot.themes?.length ?? 0) > 5 ? '...' : ''}`,
    ];

    if (customPrompt) {
        basePrompt.push(
            '',
            '=== USER CUSTOM RULES (HIGHEST PRIORITY) ===',
            'The following are user-defined rules. Follow these rules STRICTLY:',
            '',
            customPrompt,
            '',
            '=== END OF CUSTOM RULES ===',
            ''
        );
    }

    basePrompt.push(
        '',
        '=== DEFAULT RULES (use when custom rules do not apply) ===',
        '',
        'GOAL / PRESET SELECTION:',
        '1. goalPath is REQUIRED when snapshot.goals is not empty. Use a FULL goal path from snapshot.goals[].path.',
        '2. Choose blockId first, then choose the best preset from snapshot.goalPresets with the same goalPath and blockId. categoryKey is only a display helper.',
        '3. If a preset clearly matches user words, return target.goalTemplateId = preset.goalTemplateId/id and target.templateVariantId = preset.variantId.',
        '4. If several presets match, prefer the closest themePath/name match.',
        '5. themeId should come from the selected preset themePath or selected goal themePath. Theme is only a form default/stat dimension, not the main template selector.',
        '6. Do not output deprecated templateSourceType values.',
        '',
        'BLOCK SELECTION:',
        '1. blockId is REQUIRED and must come from snapshot.blocks[].id or snapshot.goalPresets[].blockId, e.g. core.task/core.habit/core.plan.',
        '2. categoryKey is optional display text. Return it only when it helps compatibility, and it must come from snapshot.blocks[].categoryKey.',
        '3. Common patterns:',
        '   - "任务"/"要做"/"待办" → blockId = "core.task"',
        '   - "计划" → blockId = "core.plan"',
        '   - "总结"/"复盘" → blockId = "core.review"',
        '   - "打卡"/"记录状态" → blockId = "core.habit"',
        '   - "闪念"/"想法"/"灵感" → blockId = "core.thought"',
        '4. Do not invent blockId or categoryKey that does not exist in the snapshot.',
        '',
        'FIELD VALUES:',
        '1. Keys MUST be from the selected preset.fields[].key when preset is selected; otherwise use snapshot.blocks[].fields[].key',
        '2. Date format: YYYY-MM-DD',
        '3. Time format: HH:mm',
        '4. Select/radio/rating: return the exact option.value or option.label from snapshot; the app will map it back to the configured option object',
        '5. Rating: use numeric value (1-5)',
        '6. Use current date/time if not specified in input',
        '7. Do NOT put system context fields into fieldValues: goalId, goalPath, themePath, templateId, templateSourceType, templateVariantId, 周期, 周期ID, 周期粒度. Put goal/preset/theme information under target only.',
        '8. For 计划/总结, do not invent 周期 fields. The app derives period from the selected preset periodPolicy and 日期.',
        '',
        '=== EXAMPLE ===',
        'If user says "记录今天运动 30 分钟" and goal/preset include "强健身体 × core.habit → 运动打卡(健康/运动)":',
        '{',
        '  "items": [{',
        '    "rawText": "记录今天运动 30 分钟",',
        '    "target": { "blockId": "core.habit", "categoryKey": "打卡", "goalPath": "强健身体", "goalTemplateId": "goal-template.goal.health.core.habit.running", "templateVariantId": "running", "themeId": "健康/运动" },',
        '    "fieldValues": { "日期": "2024-01-15", "内容": "运动 30 分钟" },',
        '    "meta": { "confidence": 0.95 }',
        '  }]',
        '}'
    );

    return basePrompt.join('\n');
}

/** 快速模式系统提示：压缩规则，降低首包等待前的模型上下文负担。 */
export function buildAiFastSystemPrompt(customPrompt: string): string {
    const lines = [
        'You convert user text into Think plugin record commands.',
        'Return ONLY valid JSON. No markdown. No explanations.',
        'Schema: {"items":[{"rawText":"...","target":{"blockId":"core.task","categoryKey":"optional label","goalPath":"...","goalTemplateId":"optional","templateVariantId":"optional","themeId":"..."},"fieldValues":{},"meta":{"confidence":0.9}}]}',
        'Use only goalPath/blockId/categoryKey/goalTemplateId/templateVariantId/themeId/fields provided by user prompt.',
        'If uncertain, choose the first plausible goal, preset/theme, and blockId.',
        'Dates: YYYY-MM-DD. Times: HH:mm. Never put goal/theme/template/period system fields into fieldValues.',
    ];

    if (customPrompt) {
        lines.push('', 'User custom rules, highest priority:', customPrompt);
    }

    return lines.join('\n');
}

/** 构建用户提示。 */
export function buildAiUserPrompt(text: string, nowIso: string, maxResults: number, snapshot: AiParserSnapshot): string {
    return [
        `Current time: ${nowIso}`,
        `Max results: ${maxResults}`,
        '',
        '=== AVAILABLE GOALS (choose one when possible) ===',
        JSON.stringify(snapshot.goals || [], null, 2),
        '',
        '=== AVAILABLE GOAL PRESETS (prefer matching goalPath + Block) ===',
        JSON.stringify(snapshot.goalPresets || [], null, 2),
        '',
        '=== AVAILABLE THEMES (use preset themePath or choose one) ===',
        JSON.stringify(snapshot.themes, null, 2),
        '',
        '=== AVAILABLE BLOCKS ===',
        JSON.stringify(snapshot.blocks, null, 2),
        '',
        '=== USER INPUT ===',
        text,
        '',
        'Return JSON with target.goalPath, target.blockId, optional target.categoryKey, target.goalTemplateId/templateVariantId when possible, and target.themeId filled. Put only user-editable fields in fieldValues:',
    ].join('\n');
}

/** 快速模式用户提示：只保留必要字段，减少请求体积和模型推理负担。 */
export function buildAiFastUserPrompt(text: string, nowIso: string, maxResults: number, snapshot: AiParserSnapshot): string {
    const themePaths = (snapshot.themes ?? []).map((theme) => theme.path).filter(Boolean);
    const availableGoalPaths = (snapshot.goals ?? []).map((goal) => goal.path).filter(Boolean);
    const compactPresets = (snapshot.goalPresets ?? []).map((preset) => ({
        goalPath: preset.goalPath,
        blockId: preset.blockId,
        categoryKey: preset.categoryKey,
        variantId: preset.variantId,
        goalTemplateId: preset.goalTemplateId || preset.id,
        name: preset.name,
        themePath: preset.themePath,
    }));
    const compactBlocks = (snapshot.blocks ?? []).map((block) => ({
        id: block.id,
        name: block.name,
        categoryKey: block.categoryKey,
        fields: (block.fields ?? []).map((field) => field.key || field.label).filter(Boolean),
    }));

    return [
        `Current time: ${nowIso}`,
        `Max results: ${maxResults}`,
        'Fast mode: prefer the simplest correct parse. Return compact JSON only.',
        '',
        'Goals:',
        availableGoalPaths.join(' | '),
        '',
        'Goal presets:',
        JSON.stringify(compactPresets),
        '',
        'Themes:',
        themePaths.join(' | '),
        '',
        'Blocks:',
        JSON.stringify(compactBlocks),
        '',
        'User input:',
        text,
        '',
        'Return JSON: {"items":[{"rawText":"...","target":{"goalPath":"...","blockId":"...","categoryKey":"optional","goalTemplateId":"optional","templateVariantId":"optional","themeId":"..."},"fieldValues":{},"meta":{"confidence":0.9}}]}',
    ].join('\n');
}
