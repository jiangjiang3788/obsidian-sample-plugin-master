import type { RecordViewItem } from '@core/types/public';

export function selectAllWhiteboardRecordIds(records: readonly RecordViewItem[]): Set<string> {
  return new Set(records.map((record) => record.id));
}

export function pruneWhiteboardRecordSelection(
  selectedIds: ReadonlySet<string>,
  availableRecords: readonly RecordViewItem[],
): Set<string> {
  if (selectedIds.size === 0) return new Set();
  const availableIds = new Set(availableRecords.map((record) => record.id));
  return new Set(Array.from(selectedIds).filter((id) => availableIds.has(id)));
}

export function toggleWhiteboardRecordSelection(selectedIds: ReadonlySet<string>, recordId: string): Set<string> {
  const next = new Set(selectedIds);
  if (next.has(recordId)) next.delete(recordId);
  else next.add(recordId);
  return next;
}

/** 拖已选 Record = 拖整组；拖未选 Record = 保持 1.1.2 的单条拖入语义。 */
export function resolveWhiteboardSourceDragRecords(
  origin: RecordViewItem,
  selectedIds: ReadonlySet<string>,
  orderedResults: readonly RecordViewItem[],
): RecordViewItem[] {
  if (!selectedIds.has(origin.id)) return [origin];
  const selected = orderedResults.filter((record) => selectedIds.has(record.id));
  return selected.length > 0 ? selected : [origin];
}
