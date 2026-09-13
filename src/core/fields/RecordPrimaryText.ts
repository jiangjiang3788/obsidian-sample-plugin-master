import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { RecordType } from '@/core/records/public';
import { readEnergyItemSnapshot } from '@/core/energy/item';
import { getRecordTypePresentation, normalizeRecordTypePresentationKey } from '@/core/recordTypes/public';

function compact(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function fallbackLabel(item: RecordViewItem): string {
  return getRecordTypePresentation(item.recordType).label || '记录';
}

function genericPrimary(item: RecordViewItem): string {
  return compact(item.content) || fallbackLabel(item);
}

type PrimaryTextResolver = (item: RecordViewItem) => string;

const energyPrimary: PrimaryTextResolver = (item) => {
  const snapshot = readEnergyItemSnapshot(item);
  if (snapshot) return `精力 ${snapshot.score}`;
  return compact(item.content) || '精力';
};

const habitPrimary: PrimaryTextResolver = (item) => {
  const content = compact(item.content);
  if (content) return content;
  if (item.rating != null && Number.isFinite(Number(item.rating))) return `打卡 · 评分 ${item.rating}`;
  return '打卡';
};

const taskSessionPrimary: PrimaryTextResolver = (item) => {
  const content = compact(item.content);
  if (content) return content;
  if (item.sessionDurationMinutes != null && Number.isFinite(Number(item.sessionDurationMinutes))) {
    return `任务工作块 · ${item.sessionDurationMinutes} 分钟`;
  }
  return '任务工作块';
};

/**
 * Exhaustive Record-type policy table. Most text-shaped Records deliberately
 * share the generic resolver; value-shaped Records own explicit resolvers.
 * Having all 12 keys here prevents a new Record type from silently bypassing
 * the global presentation contract.
 */
const PRIMARY_TEXT_RESOLVERS: Record<RecordType, PrimaryTextResolver> = {
  task: genericPrimary,
  'task-session': taskSessionPrimary,
  'task-series': genericPrimary,
  energy: energyPrimary,
  habit: habitPrimary,
  event: genericPrimary,
  feeling: genericPrimary,
  thought: genericPrimary,
  review: genericPrimary,
  plan: genericPrimary,
  blocker: genericPrimary,
  milestone: genericPrimary,
};

/**
 * Human-facing representative text for a Record.
 *
 * Contract:
 * - derived only; never persisted back into Record.title;
 * - an explicit title wins when present;
 * - value-shaped Records can derive a compact representative value;
 * - views remain free to choose `title` instead, in which case an empty title
 *   stays empty. Type-aware fallback exists only behind explicit `primaryText`.
 */
export function getRecordPrimaryText(item: RecordViewItem): string {
  const title = compact(item.title);
  if (title) return title;

  const recordType = normalizeRecordTypePresentationKey(item.recordType) as RecordType;
  const resolver = PRIMARY_TEXT_RESOLVERS[recordType];
  return resolver ? resolver(item) : genericPrimary(item);
}
