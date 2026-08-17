import type { RecordViewItem } from '@/core/records/RecordEntity';

/** Output location/content computed before persistence. */
export interface RecordOutputPlan {
  recordId?: string | null;
  coreBlock?: string | null;
  targetFilePath: string | null;
  targetHeader: string | null;
  outputContent: string;
  renderData: Record<string, unknown>;
}

export interface RecordPersistencePlan {
  originalPath: string | null;
  pathChanged: boolean;
  writeMode: 'create' | 'update_in_place' | 'move_and_replace';
}

export interface ParsedRecordSnapshot {
  itemId: string;
  entryKind: 'task' | 'block';
  locator: { path: string | null; line: number | null };
  raw: { sourceText: string };
  semantic: {
    title: string | null;
    editableText: string | null;
    content: string | null;
    date: string | null;
    period: string | null;
    tags: string[];
    goalPath: string | null;
    startTime: string | null;
    endTime: string | null;
    duration: number | null;
    categoryKey: string | null;
  };
  extra: Record<string, unknown>;
}

export interface EditableRecordSnapshot {
  mode: 'create' | 'edit';
  parsed: ParsedRecordSnapshot | null;
  blockId: string | null;
  fields: Record<string, unknown>;
  outputPlan: RecordOutputPlan;
  persistencePlan: RecordPersistencePlan;
}

function pickEditableText(item: RecordViewItem): string | null {
  if (item.editableText?.trim()) return item.editableText.trim();
  const extraBody = item.extra?.['正文'];
  if (typeof extraBody === 'string' && extraBody.trim()) return extraBody.trim();
  return item.content?.trim() || item.title || null;
}

export function buildParsedRecordSnapshot(item: RecordViewItem): ParsedRecordSnapshot {
  const path = item.source?.path ?? item.file?.path ?? null;
  const line = item.source?.startLine ?? (typeof item.file?.line === 'number' ? item.file.line : null);
  const editableText = pickEditableText(item);
  return {
    itemId: item.id,
    entryKind: item.coreBlock === 'task' ? 'task' : 'block',
    locator: { path, line },
    raw: { sourceText: item.rawSource || item.content || '' },
    semantic: {
      title: item.title || null,
      editableText,
      content: item.content || null,
      date: item.date || item.createdDate || null,
      period: item.period || null,
      tags: [...(item.tags || [])],
      goalPath: item.goalPath || null,
      startTime: item.startTime || null,
      endTime: item.endTime || null,
      duration: item.duration ?? null,
      categoryKey: item.categoryKey || null,
    },
    extra: { ...(item.extra || {}) },
  };
}
