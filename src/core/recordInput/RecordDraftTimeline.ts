import { readOptionText } from '../semantics/option';
import { normalizeAiTaskStatus } from '../ai/AiTaskCapture';
import { TASK_STATUS_PRESENTATION } from '../records/task/taskStatus';

export interface TimelineDraftInput {
  id: string;
  recordTypeId: string;
  formData: Record<string, unknown>;
  saved: boolean;
  skipped: boolean;
}
export interface DraftTimelineEntry {
  id: string;
  sourceIndex: number;
  title: string;
  status: string;
  saveState: string;
  kind: 'actual' | 'plan' | 'record';
  kindLabel: string;
  startMinute: number;
  endMinute: number;
  day: string;
  lane: number;
  laneCount: number;
}
export interface UnplacedTimelineDraft {
  id: string;
  sourceIndex: number;
  title: string;
  reason: string;
  status: string;
  saveState: string;
}

function text(value: unknown): string {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : '';
  const option = readOptionText(value);
  return String(option.value || option.label || '').trim();
}

/** Only explicit calendar date + clock time can be positioned. No Date.now fallback. */
function dateTime(value: unknown, date: unknown): Date | null {
  let raw = text(value);
  if (/^\d{2}:\d{2}(?::\d{2})?$/.test(raw) && /^\d{4}-\d{2}-\d{2}$/.test(text(date))) raw = `${text(date)}T${raw}`;
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?$/.exec(raw);
  if (!match) return null;
  const [, y, m, d, h, minute, second = '0', zone] = match;
  const dayCheck = new Date(Date.UTC(+y, +m - 1, +d));
  if (dayCheck.getUTCFullYear() !== +y || dayCheck.getUTCMonth() !== +m - 1 || dayCheck.getUTCDate() !== +d
    || +h > 24 || +minute > 59 || +second > 59 || (+h === 24 && (+minute !== 0 || +second !== 0))) return null;
  const parsed = new Date(raw.replace(' ', 'T'));
  if (!Number.isFinite(parsed.getTime())) return null;
  // A nonexistent local DST hour is uncertain, not permission to silently shift the input.
  if (!zone && +h < 24 && (parsed.getFullYear() !== +y || parsed.getMonth() !== +m - 1 || parsed.getDate() !== +d || parsed.getHours() !== +h || parsed.getMinutes() !== +minute)) return null;
  return parsed;
}
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function wallMinute(date: Date): number { return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60; }

/** Pure projection of the SAME edited drafts used by submission. Never writes or infers completion. */
export function buildRecordDraftTimeline(records: readonly TimelineDraftInput[]): {
  days: Array<{ day: string; entries: DraftTimelineEntry[] }>;
  unplaced: UnplacedTimelineDraft[];
  startMinute: number;
  endMinute: number;
} {
  const byDay = new Map<string, DraftTimelineEntry[]>();
  const unplaced: UnplacedTimelineDraft[] = [];
  records.forEach((record, sourceIndex) => {
    const data = record.formData;
    const title = text(data['内容'] ?? data['任务内容'] ?? data.content ?? data.title) || `记录 ${sourceIndex + 1}`;
    const task = record.recordTypeId === 'core.task';
    const taskStatus = normalizeAiTaskStatus(data.status ?? data['状态']);
    const status = task ? (taskStatus ? TASK_STATUS_PRESENTATION[taskStatus].label : '状态待确认') : '记录';
    const saveState = record.saved ? '已保存' : record.skipped ? '已跳过' : '待保存';
    const actualStart = data['实际开始'] ?? data['开始时间'] ?? data['开始/预计时间'] ?? data.startAt;
    const planStart = data['计划时间'] ?? data.scheduledAt ?? data['计划日期'] ?? data.scheduledDate;
    const isPlan = !text(actualStart) && Boolean(text(planStart));
    const started = dateTime(isPlan ? planStart : actualStart, data['日期'] ?? data.date);
    const rawEnd = isPlan ? data['计划结束'] ?? data.scheduledEndAt : data['实际结束'] ?? data['结束时间'] ?? data.endAt;
    const ended = text(rawEnd) ? dateTime(rawEnd, data['日期'] ?? data.date) : null;
    const addUnplaced = (reason: string) => unplaced.push({ id: record.id, sourceIndex, title, reason, status, saveState });
    if (!started) { addUnplaced('缺少有效的日期和开始时刻；仅有时长不自动分配时间'); return; }
    if (text(rawEnd) && (!ended || ended.getTime() < started.getTime())) {
      addUnplaced('结束时间无效或早于开始；跨天请填写明确的结束日期'); return;
    }
    if (ended && ended.getTime() - started.getTime() > 31 * 86400000) {
      addUnplaced('区间超过 31 天，请在表单核对后处理'); return;
    }
    const kind = isPlan ? 'plan' : task && taskStatus === 'done' && ended && ended.getTime() > started.getTime() ? 'actual' : 'record';
    const kindLabel = kind === 'plan' ? '计划' : kind === 'actual' ? '实际投入' : '记录区间（非完成判定）';
    const segments: DraftTimelineEntry[] = [];
    let cursor = new Date(started);
    const end = ended ?? started;
    do {
      const nextDay = new Date(cursor); nextDay.setHours(0, 0, 0, 0); nextDay.setDate(nextDay.getDate() + 1);
      const endHere = Math.min(nextDay.getTime(), end.getTime());
      const startMinute = wallMinute(cursor);
      const endMinute = endHere === nextDay.getTime() ? 1440 : wallMinute(new Date(endHere));
      if (endMinute < startMinute) { addUnplaced('夏令时回拨造成时钟次序歧义，请在表单核对'); return; }
      segments.push({ id: record.id, sourceIndex, title, status, saveState, kind, kindLabel,
        day: dayKey(cursor), startMinute, endMinute, lane: 0, laneCount: 1 });
      cursor = nextDay;
    } while (cursor.getTime() < end.getTime());
    for (const entry of segments) {
      const list = byDay.get(entry.day) ?? [];
      list.push(entry); byDay.set(entry.day, list);
    }
  });
  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, entries]) => {
    entries.sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute || a.sourceIndex - b.sourceIndex);
    const laneEnds: number[] = [];
    for (const entry of entries) {
      let lane = laneEnds.findIndex((end) => end <= entry.startMinute);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = Math.max(entry.startMinute + 0.01, entry.endMinute);
      entry.lane = lane;
    }
    for (const entry of entries) entry.laneCount = laneEnds.length;
    return { day, entries };
  });
  const entries = days.flatMap((day) => day.entries);
  const first = entries.length ? Math.min(...entries.map((entry) => entry.startMinute)) : 0;
  const last = entries.length ? Math.max(...entries.map((entry) => entry.endMinute)) : 60;
  const startMinute = Math.max(0, Math.floor(first / 60) * 60);
  const endMinute = Math.min(1440, Math.max(startMinute + 60, Math.ceil((last + 1) / 60) * 60));
  return { days, unplaced, startMinute, endMinute };
}
