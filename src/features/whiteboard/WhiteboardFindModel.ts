import type { RecordViewItem } from '@core/types/public';
import type { WhiteboardItem } from '@core/whiteboard/public';
import { buildWhiteboardRecordPresentation } from './WhiteboardRecordPresentation';

function normalize(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

function queryTokens(query: string): string[] {
  return normalize(query).split(' ').filter(Boolean);
}

export function getWhiteboardFindHaystack(record: RecordViewItem | null, item: WhiteboardItem): string {
  if (!record) return normalize(`${item.recordId} ${item.id}`);
  const presentation = buildWhiteboardRecordPresentation(record);
  return normalize([
    item.recordId,
    record.id,
    record.recordType,
    record.title,
    record.content,
    record.goalPath,
    record.date,
    record.recordSubtype,
    record.rating,
    record.sessionStartedAt,
    record.sessionDurationMinutes,
    ...(record.tags ?? []),
    presentation.typeLabel,
    presentation.primaryText,
    presentation.temporalLabel,
    presentation.goalLabel,
    ...presentation.detailLabels,
  ].join(' '));
}

/**
 * 1.1.3：只在当前白板 items 中定位。查询是 ephemeral UI state，
 * 不过滤/重排 item，也不触碰 WhiteboardStore durable state。
 */
export function findWhiteboardItemIds(
  items: readonly WhiteboardItem[],
  recordsById: ReadonlyMap<string, RecordViewItem>,
  query: string,
): string[] {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return [];
  return items
    .filter((item) => {
      const haystack = getWhiteboardFindHaystack(recordsById.get(item.recordId) ?? null, item);
      return tokens.every((token) => haystack.includes(token));
    })
    .map((item) => item.id);
}

export function stepWhiteboardFindIndex(currentIndex: number, matchCount: number, delta: number): number {
  if (matchCount <= 0) return 0;
  const normalized = ((currentIndex + delta) % matchCount + matchCount) % matchCount;
  return normalized;
}
