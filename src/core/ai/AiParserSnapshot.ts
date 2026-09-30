export interface AiSnapshotField {
  key?: string;
  label?: string;
  type?: string;
  options?: Array<{ value: string; label: string }>;
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
  fields?: AiSnapshotField[];
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
    fields?: AiSnapshotField[];
  }>;
}

export function compactSnapshotForFastMode(snapshot: AiParserSnapshot): CompactAiParserSnapshot {
  return {
    recordTypes: (snapshot.recordTypes ?? []).map((recordType) => ({
      id: recordType.id,
      name: recordType.name,
      fields: (recordType.fields ?? []).map((field) => ({ key: field.key, label: field.label, type: field.type, options: field.options })),
    })),
    goals: (snapshot.goals ?? []).map((goal) => ({ path: goal.path })),
    goalPresets: (snapshot.goalPresets ?? []).map((preset) => ({
      goalPath: preset.goalPath,
      recordTypeId: preset.recordTypeId,
      goalTemplateId: preset.goalTemplateId || preset.id,
      fields: (preset.fields ?? []).map((field) => ({ key: field.key, label: field.label, type: field.type, options: field.options })),
    })),
  };
}
