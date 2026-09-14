import type { RecordViewItem } from '@/core/records/RecordEntity';
import { readField } from '@/core/fields/ViewFieldCatalog';
import { exportRecordList, renderGenericRecord, renderTask, titleLines } from './recordRenderer';
import { dateOnly, filteredTaskSessions, inRange, overlapsRange, type ExportRuntimeContext } from './model';

function eventTimelineItems(ctx: ExportRuntimeContext): RecordViewItem[] {
  const timeField = String(ctx.request.viewInstance?.viewConfig?.timeField || 'date');
  const rows = ctx.request.items.filter((item) => {
    const value = readField(item, timeField);
    return ctx.request.dateRange ? inRange(value, ctx.request.dateRange) : value != null && value !== '';
  });
  return [...rows].sort((left, right) => String(readField(left, timeField) || '').localeCompare(String(readField(right, timeField) || '')));
}

export function exportEventTimeline(ctx: ExportRuntimeContext): string {
  const rows = eventTimelineItems(ctx);
  if (ctx.groupFields.length) return exportRecordList(ctx, rows, ctx.groupFields);
  if (ctx.request.viewInstance?.viewConfig?.groupByDay !== false) {
    const timeField = String(ctx.request.viewInstance?.viewConfig?.timeField || 'date');
    const lines = titleLines(ctx);
    const byDay = new Map<string, RecordViewItem[]>();
    for (const item of rows) {
      const day = dateOnly(readField(item, timeField)) || '未标日期';
      const bucket = byDay.get(day) || [];
      bucket.push(item); byDay.set(day, bucket);
    }
    for (const [day, bucket] of byDay) {
      lines.push(`## ${day}`, '');
      for (const item of bucket) lines.push(...renderGenericRecord(item, ctx));
      lines.push('');
    }
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  return exportRecordList(ctx, rows, []);
}

function taskRelevantToTimeline(item: RecordViewItem, ctx: ExportRuntimeContext): boolean {
  if (item.recordType !== 'task') return false;
  if (!ctx.request.dateRange) return true;
  const sessions = (ctx.sessionsByTask.get(item.id) || []).filter((session) => overlapsRange(session.sessionStartedAt, session.sessionEndedAt, ctx.request.dateRange));
  return sessions.length > 0
    || overlapsRange(item.startAt, item.endAt, ctx.request.dateRange)
    || inRange(item.scheduledAt, ctx.request.dateRange)
    || inRange(item.startAt, ctx.request.dateRange);
}

function timelineSortKey(item: RecordViewItem, ctx: ExportRuntimeContext): string {
  const firstSession = filteredTaskSessions(item, ctx)[0]?.sessionStartedAt;
  return String(firstSession || item.startAt || item.scheduledAt || item.completedAt || item.date || '9999');
}

export function exportTimeline(ctx: ExportRuntimeContext): string {
  const tasks = ctx.request.items.filter((item) => taskRelevantToTimeline(item, ctx))
    .sort((a, b) => timelineSortKey(a, ctx).localeCompare(timelineSortKey(b, ctx)));
  const lines = titleLines(ctx);
  if (!tasks.length) return lines.concat(['没有当前时间范围内的任务']).join('\n').trim();

  const byDay = new Map<string, RecordViewItem[]>();
  for (const task of tasks) {
    const day = dateOnly(timelineSortKey(task, ctx)) || '未标日期';
    const rows = byDay.get(day) || [];
    rows.push(task); byDay.set(day, rows);
  }
  for (const [day, rows] of byDay) {
    lines.push(`## ${day}`, '');
    for (const task of rows) lines.push(...renderTask(task, ctx));
    lines.push('');
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
