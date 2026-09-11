import type { RecordViewItem } from '@core/types/public';
import { getRecordPrimaryText } from '@core/fields/public';
import { getRecordTypePresentation } from '@core/recordTypes/public';
import { dayjs } from '@core/utils/public';
import type { WhiteboardPosition } from '@core/whiteboard/public';

export interface WhiteboardRecordPresentation {
  typeLabel: string;
  primaryText: string;
  summary: string;
  temporalLabel: string;
  goalLabel: string;
  detailLabels: string[];
}

function compactText(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function getWhiteboardRecordTypeLabel(item: RecordViewItem): string {
  return getRecordTypePresentation(item.coreBlock).label
    || compactText(item.categoryKey)
    || compactText(item.coreBlock)
    || '记录';
}

function formatDateTime(value: unknown, includeTime: boolean): string {
  if (!value) return '';
  const parsed = dayjs(value as string | number | Date);
  if (!parsed.isValid()) return compactText(value);
  return parsed.format(includeTime ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD');
}

export function buildWhiteboardRecordPresentation(item: RecordViewItem): WhiteboardRecordPresentation {
  const typeLabel = getWhiteboardRecordTypeLabel(item);
  const primaryText = truncate(compactText(getRecordPrimaryText(item)) || typeLabel, 90);
  const rawContent = compactText(item.content);
  const summarySource = rawContent && rawContent !== compactText(item.title) && rawContent !== compactText(primaryText)
    ? rawContent
    : '';

  const temporalLabel = item.coreBlock === 'task-session'
    ? formatDateTime(item.sessionStartedAt || item.date, true)
    : formatDateTime(item.date, false);

  const detailLabels: string[] = [];
  if (item.coreBlock === 'thought' && item.recordSubtype) detailLabels.push(String(item.recordSubtype));
  if (item.coreBlock === 'habit' && item.rating != null && !primaryText.includes(`评分 ${item.rating}`)) detailLabels.push(`评分 ${item.rating}`);
  if (item.coreBlock === 'task-session' && item.sessionDurationMinutes != null && !primaryText.includes(`${item.sessionDurationMinutes} 分钟`)) {
    detailLabels.push(`${item.sessionDurationMinutes} 分钟`);
  }

  return {
    typeLabel,
    primaryText,
    summary: truncate(summarySource, 180),
    temporalLabel,
    goalLabel: compactText(item.goalPath),
    detailLabels,
  };
}

/**
 * 新卡的稳定默认落点。x/y/zIndex 只属于 Whiteboard 空间状态；
 * Record presentation 不写回 canonical Record。
 */
export function getDefaultWhiteboardPosition(index: number): WhiteboardPosition {
  const safeIndex = Math.max(0, Math.floor(index));
  const column = safeIndex % 3;
  const row = Math.floor(safeIndex / 3);
  return {
    x: 24 + column * 272,
    y: 24 + row * 196,
    zIndex: safeIndex + 1,
  };
}
