export interface AiSnapshotField {
  key?: string;
  label?: string;
  type?: string;
}

export interface AiSnapshotRecordType {
  id?: string;
  name?: string;
  fields?: AiSnapshotField[];
}


export interface AiSnapshotGoal {
  path?: string;
}

export interface AiSnapshotPreset {
  id?: string;
  goalTemplateId?: string;
  goalPath?: string;
  recordTypeId?: string;
}

export interface AiParserSnapshot {
  recordTypes?: AiSnapshotRecordType[];
  goals?: AiSnapshotGoal[];
  goalPresets?: AiSnapshotPreset[];
}

export interface CompactAiParserSnapshot {
  recordTypes: Array<{ id?: string; name?: string; fields: AiSnapshotField[] }>;
  goals: Array<{ path?: string }>;
  goalPresets: Array<{
    goalPath?: string;
    recordTypeId?: string;
      goalTemplateId?: string;
  }>;
}

export function compactSnapshotForFastMode(snapshot: AiParserSnapshot): CompactAiParserSnapshot {
  return {
    recordTypes: (snapshot.recordTypes ?? []).map((recordType) => ({
      id: recordType.id,
      name: recordType.name,
      fields: (recordType.fields ?? []).map((field) => ({ key: field.key, label: field.label, type: field.type })),
    })),
    goals: (snapshot.goals ?? []).map((goal) => ({ path: goal.path })),
    goalPresets: (snapshot.goalPresets ?? []).map((preset) => ({
      goalPath: preset.goalPath,
      recordTypeId: preset.recordTypeId,
      goalTemplateId: preset.goalTemplateId || preset.id,
    })),
  };
}
