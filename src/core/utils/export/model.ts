import type { GoalDefinition } from '@/core/goal/types';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { ViewInstance } from '@/core/view/ViewConfig';
import { readField } from '@/core/fields/ViewFieldCatalog';
import { getFieldDefinition } from '@/core/fields/FieldRegistry';
import { normalizeFieldKey } from '@/core/fields/FieldValueResolver';
import { getRecordPrimaryText } from '@/core/fields/RecordPrimaryText';
import { getRecordTypePresentation } from '@/core/recordTypes/public';
import { getViewExportConfig, BLOCK_EXPORT_DEFAULT_CONFIG, type ExportViewConfig } from '@/core/config/views';

export interface ExportViewRequest {
  /** 当前 View 真正允许导出的数据集合；排序应已由 View Query 完成。 */
  items: RecordViewItem[];
  /** TaskSession / TaskSeries 等关联证据。默认退回 items。 */
  relatedRecords?: RecordViewItem[];
  /** View 决定筛选后的结构、显示字段与分组语义。 */
  viewInstance?: Pick<ViewInstance, 'title' | 'viewType' | 'fields' | 'group' | 'groupFields' | 'viewConfig'>;
  /** 允许弹窗等局部导出显式覆盖策略。 */
  config?: ExportViewConfig;
  goals?: GoalDefinition[];
  dateRange?: [Date, Date];
  currentView?: string;
}

export interface ExportRuntimeContext {
  request: ExportViewRequest;
  config: ExportViewConfig;
  relatedRecords: RecordViewItem[];
  sessionsByTask: Map<string, RecordViewItem[]>;
  recordTypeCount: number;
  groupFields: string[];
}

export const TECHNICAL_FIELDS = new Set([
  'id', 'seriesId', 'taskId', 'currentTaskId', 'cycleId', 'fullData', 'rawSource',
  'created', 'modified', 'file', 'source', 'filename', 'fileName', 'folder', 'header',
  'startEnergyRecordId', 'endEnergyRecordId',
]);

export const INTERNAL_RECORD_TYPES = new Set(['task-session', 'task-series']);

export const RECORD_PROFILE_FIELDS: Record<string, string[]> = {
  habit: ['goalPath', 'date', 'rating', 'image', 'content'],
  plan: ['goalPath', 'date', 'period', 'content'],
  review: ['goalPath', 'date', 'period', 'content'],
  thought: ['goalPath', 'date', 'content'],
  feeling: ['goalPath', 'date', 'content'],
  event: ['goalPath', 'date', 'content'],
  blocker: ['goalPath', 'date', 'content'],
  milestone: ['goalPath', 'date', 'content'],
  energy: ['goalPath', 'date'],
};

export const TASK_STATUS_PRESENTATION: Record<string, { emoji: string; label: string }> = {
  open: { emoji: '⏳', label: '未完成' },
  done: { emoji: '✅', label: '已完成' },
  cancelled: { emoji: '🚫', label: '已取消' },
  skipped: { emoji: '⏭️', label: '已跳过' },
  unknown: { emoji: '•', label: '未知' },
};

export const QUADRANT_LABELS: Record<string, string> = {
  q1: '重要且紧急', q2: '重要不紧急', q3: '不重要但紧急', q4: '不重要不紧急', unclassified: '未分类',
};

export function getExportConfig(viewType: string): ExportViewConfig {
  return getViewExportConfig(viewType) || BLOCK_EXPORT_DEFAULT_CONFIG;
}

export function compactText(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

export function formatMinutes(value: number): string {
  return `${formatNumber(value)} 分钟`;
}

export function formatDateTime(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const iso = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/.exec(text);
  return iso ? `${iso[1]} ${iso[2]}` : text;
}

export function dateOnly(value: unknown): string {
  const text = String(value ?? '').trim();
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(text);
  return match?.[1] || text;
}

export function localDateText(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

export function fieldLabel(field: string): string {
  const canonical = normalizeFieldKey(field);
  return getFieldDefinition(canonical)?.label || field;
}

function formatStatus(value: unknown): string {
  const key = String(value ?? '').trim();
  return TASK_STATUS_PRESENTATION[key]?.label || key;
}

export function formatFieldValue(field: string, rawValue: unknown): string {
  const canonical = normalizeFieldKey(field);
  if (canonical === 'recordType') return getRecordTypePresentation(rawValue).label;
  if (canonical === 'status') return formatStatus(rawValue);
  if (canonical === 'primaryText') return compactText(rawValue);
  if (Array.isArray(rawValue)) return rawValue.map(compactText).filter(Boolean).join('、');
  if (/At$/.test(canonical) || ['date', 'scheduledDate', 'startDate', 'dueDate', 'doneDate', 'cancelledDate'].includes(canonical)) {
    return formatDateTime(rawValue);
  }
  return String(rawValue);
}

export function imageDisplay(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const isEmojiOnly = /^[\p{Emoji}\p{Emoji_Presentation}\p{Extended_Pictographic}\s]*$/u.test(text)
    && text.length <= 8 && !text.includes('.');
  if (isEmojiOnly || text.startsWith('![[') || text.startsWith('![')) return text;
  return `![[${text}]]`;
}

export function pushField(lines: string[], label: string, value: unknown, field?: string): void {
  if (isEmpty(value)) return;
  if (field === 'image') {
    const display = imageDisplay(value);
    if (display) lines.push(`  - ${label}：${display}`);
    return;
  }
  const display = field ? formatFieldValue(field, value) : String(value);
  if (!display) return;
  if (field === 'content' && display.includes('\n')) {
    lines.push(`  - ${label}：`);
    for (const row of display.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)) lines.push(`    - ${row}`);
    return;
  }
  lines.push(`  - ${label}：${display}`);
}

export function timestamp(value: unknown): number | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const ms = Date.parse(text);
  return Number.isFinite(ms) ? ms : null;
}

export function overlapsRange(startValue: unknown, endValue: unknown, dateRange?: [Date, Date]): boolean {
  if (!dateRange) return true;
  const start = timestamp(startValue);
  if (start == null) return false;
  const end = timestamp(endValue) ?? start;
  return end >= dateRange[0].getTime() && start <= dateRange[1].getTime();
}

export function inRange(value: unknown, dateRange?: [Date, Date]): boolean {
  if (!dateRange) return true;
  const ms = timestamp(value);
  return ms != null && ms >= dateRange[0].getTime() && ms <= dateRange[1].getTime();
}

function sessionMap(records: RecordViewItem[]): Map<string, RecordViewItem[]> {
  const result = new Map<string, RecordViewItem[]>();
  for (const record of records) {
    if (record.recordType !== 'task-session') continue;
    const taskId = String(record.taskId || '').trim();
    if (!taskId) continue;
    const rows = result.get(taskId) || [];
    rows.push(record);
    result.set(taskId, rows);
  }
  for (const rows of result.values()) rows.sort((a, b) => String(a.sessionStartedAt || '').localeCompare(String(b.sessionStartedAt || '')));
  return result;
}

function resolveGroupFields(request: ExportViewRequest, config: ExportViewConfig): string[] {
  const view = request.viewInstance;
  if (view?.viewType === 'TableView') {
    const rowField = String(view.viewConfig?.rowField || '').trim();
    const colField = String(view.viewConfig?.colField || '').trim();
    return Array.from(new Set([rowField, colField].filter(Boolean)));
  }
  if (view?.groupFields?.length) return view.groupFields.filter(Boolean);
  if (view?.group) return [view.group];
  return config.defaultGroupFields || [];
}

export function createExportRuntimeContext(request: ExportViewRequest): ExportRuntimeContext {
  const config = request.config || getExportConfig(request.viewInstance?.viewType || 'BlockView');
  const relatedRecords = request.relatedRecords || request.items;
  const userVisibleTypes = new Set(request.items
    .filter((item) => !INTERNAL_RECORD_TYPES.has(item.recordType))
    .map((item) => getRecordTypePresentation(item.recordType).recordType));
  return {
    request,
    config,
    relatedRecords,
    sessionsByTask: sessionMap(relatedRecords),
    recordTypeCount: userVisibleTypes.size,
    groupFields: resolveGroupFields(request, config),
  };
}

export function filteredTaskSessions(item: RecordViewItem, ctx: ExportRuntimeContext): RecordViewItem[] {
  const sessions = ctx.sessionsByTask.get(item.id) || [];
  if (ctx.config.taskSessionScope !== 'range' || !ctx.request.dateRange) return sessions;
  return sessions.filter((session) => overlapsRange(session.sessionStartedAt, session.sessionEndedAt, ctx.request.dateRange));
}

function durationWithinExportScope(
  startValue: unknown,
  endValue: unknown,
  fallbackMinutes: unknown,
  ctx: ExportRuntimeContext,
): number | null {
  const start = timestamp(startValue);
  let end = timestamp(endValue);
  const fallback = Number(fallbackMinutes);
  const hasFallback = Number.isFinite(fallback) && fallback > 0;

  if (start != null && end == null && hasFallback) end = start + fallback * 60_000;
  if (start != null && end != null && end >= start) {
    if (ctx.config.taskSessionScope === 'range' && ctx.request.dateRange) {
      const scopedStart = Math.max(start, ctx.request.dateRange[0].getTime());
      const scopedEnd = Math.min(end, ctx.request.dateRange[1].getTime());
      if (scopedEnd <= scopedStart) return null;
      return (scopedEnd - scopedStart) / 60_000;
    }
    return (end - start) / 60_000;
  }
  return hasFallback ? fallback : null;
}

export function taskActualDuration(item: RecordViewItem, ctx: ExportRuntimeContext): { minutes: number | null; sessionCount: number } {
  const allSessions = ctx.sessionsByTask.get(item.id) || [];
  const sessions = filteredTaskSessions(item, ctx)
    .map((session) => durationWithinExportScope(
      session.sessionStartedAt,
      session.sessionEndedAt,
      session.sessionDurationMinutes,
      ctx,
    ))
    .filter((minutes): minutes is number => minutes != null && Number.isFinite(minutes) && minutes > 0);
  if (sessions.length > 0) {
    return { minutes: Math.round(sessions.reduce((sum, minutes) => sum + minutes, 0) * 100) / 100, sessionCount: sessions.length };
  }
  // 一旦存在 TaskSession，它就是实际执行事实的权威来源；当前范围没有 Session 时不能退回 Task.startAt/endAt。
  if (allSessions.length > 0) return { minutes: null, sessionCount: 0 };

  // 旧数据完全没有 TaskSession 时，才允许使用 Task 自身的手工执行区间。
  const legacyMinutes = durationWithinExportScope(item.startAt, item.endAt, null, ctx);
  if (legacyMinutes != null && legacyMinutes > 0) {
    return { minutes: Math.round(legacyMinutes * 100) / 100, sessionCount: 0 };
  }
  return { minutes: null, sessionCount: 0 };
}

export function viewExtraFields(item: RecordViewItem, ctx: ExportRuntimeContext, alreadyUsed: Set<string>): string[] {
  const result: string[] = [];
  for (const rawField of ctx.request.viewInstance?.fields || []) {
    const field = normalizeFieldKey(rawField);
    if (!field || ['primaryText', 'title'].includes(field) || TECHNICAL_FIELDS.has(field) || alreadyUsed.has(field)) continue;
    if (item.recordType === 'task' && ['status', 'expectedDurationMinutes', 'goalPath', 'completedAt', 'cancelledAt', 'skippedAt'].includes(field)) continue;
    alreadyUsed.add(field);
    result.push(field);
  }
  return result;
}

export function resolveMainText(item: RecordViewItem, ctx: ExportRuntimeContext): string {
  const view = ctx.request.viewInstance;
  if (view?.viewType === 'EventTimelineView') {
    const titleField = String(view.viewConfig?.titleField || 'primaryText');
    const text = compactText(readField(item, titleField));
    if (text) return text;
  }
  return compactText(getRecordPrimaryText(item)) || getRecordTypePresentation(item.recordType).label;
}

export function rootGoal(item: RecordViewItem): string {
  return compactText(item.rootGoal) || compactText(item.goalPath).split('/').filter(Boolean)[0] || '未分类';
}

export function itemDate(item: RecordViewItem): string {
  return dateOnly(item.date || item.completedAt || item.doneDate || item.startAt || item.scheduledAt || item.createdDate || '');
}
