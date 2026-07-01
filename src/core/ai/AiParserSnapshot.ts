export interface AiSnapshotField {
    key?: string;
    label?: string;
    type?: string;
}

export interface AiSnapshotBlock {
    id?: string;
    name?: string;
    categoryKey?: string;
    fields?: AiSnapshotField[];
}

export interface AiSnapshotTheme {
    id?: string;
    path?: string;
}

export interface AiSnapshotGoal {
    id?: string;
    path?: string;
    title?: string;
    goalPath?: string;
    themePath?: string | null;
}

export interface AiSnapshotPreset {
    id?: string;
    goalTemplateId?: string;
    variantId?: string;
    goalId?: string;
    goalPath?: string;
    blockId?: string;
    categoryKey?: string;
    name?: string;
    themePath?: string;
}

export interface AiParserSnapshot {
    blocks?: AiSnapshotBlock[];
    themes?: AiSnapshotTheme[];
    goals?: AiSnapshotGoal[];
    goalPresets?: AiSnapshotPreset[];
}

export interface CompactAiParserSnapshot {
    blocks: Array<{ id?: string; name?: string; categoryKey?: string; fields: AiSnapshotField[] }>;
    themes: Array<{ path?: string }>;
    goals: Array<{ path?: string }>;
    goalPresets: Array<{
        goalPath?: string;
        blockId?: string;
        categoryKey?: string;
        variantId?: string;
        goalTemplateId?: string;
        name?: string;
        themePath?: string;
    }>;
}

export function compactSnapshotForFastMode(snapshot: AiParserSnapshot): CompactAiParserSnapshot {
    return {
        blocks: (snapshot.blocks ?? []).map((block) => ({
            id: block.id,
            name: block.name,
            categoryKey: block.categoryKey,
            fields: (block.fields ?? []).map((field) => ({
                key: field.key,
                label: field.label,
                type: field.type,
            })),
        })),
        themes: (snapshot.themes ?? []).map((theme) => ({
            path: theme.path,
        })),
        goals: (snapshot.goals ?? []).map((goal) => ({
            path: goal.path,
        })),
        goalPresets: (snapshot.goalPresets ?? []).map((preset) => ({
            goalPath: preset.goalPath,
            blockId: preset.blockId,
            categoryKey: preset.categoryKey,
            variantId: preset.variantId,
            goalTemplateId: preset.goalTemplateId || preset.id,
            name: preset.name,
            themePath: preset.themePath,
        })),
    };
}
