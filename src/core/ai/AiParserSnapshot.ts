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


export interface AiSnapshotGoal {
  path?: string;
}

export interface AiSnapshotPreset {
  id?: string;
  goalTemplateId?: string;
  goalPath?: string;
  blockId?: string;
  categoryKey?: string;
}

export interface AiParserSnapshot {
  blocks?: AiSnapshotBlock[];
  goals?: AiSnapshotGoal[];
  goalPresets?: AiSnapshotPreset[];
}

export interface CompactAiParserSnapshot {
  blocks: Array<{ id?: string; name?: string; categoryKey?: string; fields: AiSnapshotField[] }>;
  goals: Array<{ path?: string }>;
  goalPresets: Array<{
    goalPath?: string;
    blockId?: string;
    categoryKey?: string;
    goalTemplateId?: string;
  }>;
}

export function compactSnapshotForFastMode(snapshot: AiParserSnapshot): CompactAiParserSnapshot {
  return {
    blocks: (snapshot.blocks ?? []).map((block) => ({
      id: block.id,
      name: block.name,
      categoryKey: block.categoryKey,
      fields: (block.fields ?? []).map((field) => ({ key: field.key, label: field.label, type: field.type })),
    })),
    goals: (snapshot.goals ?? []).map((goal) => ({ path: goal.path })),
    goalPresets: (snapshot.goalPresets ?? []).map((preset) => ({
      goalPath: preset.goalPath,
      blockId: preset.blockId,
      categoryKey: preset.categoryKey,
      goalTemplateId: preset.goalTemplateId || preset.id,
    })),
  };
}
