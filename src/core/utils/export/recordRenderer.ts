import type { RecordViewItem } from '@/core/records/RecordEntity';
import { readField } from '@/core/fields/ViewFieldCatalog';
import { normalizeFieldKey } from '@/core/fields/FieldValueResolver';
import { getTaskStatus } from '@/core/records/task/taskStatus';
import { getRecordTypePresentation } from '@/core/recordTypes/public';
import { readEnergyItemSnapshot } from '@/core/energy/public';
import { groupItemsByFields, type GroupNode } from '@/core/utils/itemGrouping';
import {
  INTERNAL_RECORD_TYPES,
  RECORD_PROFILE_FIELDS,
  TASK_STATUS_PRESENTATION,
  TECHNICAL_FIELDS,
  compactText,
  dateOnly,
  fieldLabel,
  filteredTaskSessions,
  formatDateTime,
  formatFieldValue,
  formatMinutes,
  isEmpty,
  pushField,
  resolveMainText,
  taskActualDuration,
  viewExtraFields,
  type ExportRuntimeContext,
} from './model';

function isGroupedBy(ctx: ExportRuntimeContext, field: string): boolean {
  const canonical = normalizeFieldKey(field);
  return ctx.groupFields.some((groupField) => normalizeFieldKey(groupField) === canonical);
}

function viewExplicitlyShows(ctx: ExportRuntimeContext, field: string): boolean {
  const canonical = normalizeFieldKey(field);
  return (ctx.request.viewInstance?.fields || []).some((viewField) => normalizeFieldKey(viewField) === canonical);
}

export function renderTask(item: RecordViewItem, ctx: ExportRuntimeContext): string[] {
  const status = getTaskStatus(item) || 'unknown';
  const statusPresentation = TASK_STATUS_PRESENTATION[status] || TASK_STATUS_PRESENTATION.unknown;
  const lines = [`- ${statusPresentation.emoji} ${resolveMainText(item, ctx) || '未命名任务'}`];
  const used = new Set<string>(['primaryText', 'title', 'content', 'status']);

  if (!isGroupedBy(ctx, 'goalPath')) pushField(lines, '目标', item.goalPath, 'goalPath');
  used.add('goalPath');

  const actual = taskActualDuration(item, ctx);
  if (actual.minutes != null && actual.minutes > 0) {
    const label = ctx.config.taskSessionScope === 'range' ? '本期实际时长' : '实际时长';
    const countSuffix = actual.sessionCount > 1 ? `（${actual.sessionCount} 次执行）` : '';
    pushField(lines, label, `${formatMinutes(actual.minutes)}${countSuffix}`);
  }

  const expected = Number(item.expectedDurationMinutes);
  if (Number.isFinite(expected) && expected > 0) {
    pushField(lines, '预计时长', formatMinutes(expected));
    used.add('expectedDurationMinutes');
  }

  if (status === 'done') {
    pushField(lines, '完成', formatDateTime(item.completedAt || item.doneDate));
    used.add('completedAt'); used.add('doneDate');
  } else if (status === 'cancelled') {
    pushField(lines, '取消', formatDateTime(item.cancelledAt || item.cancelledDate));
    used.add('cancelledAt'); used.add('cancelledDate');
  } else if (status === 'skipped') {
    pushField(lines, '跳过', formatDateTime(item.skippedAt));
    used.add('skippedAt');
  } else {
    pushField(lines, '计划时间', formatDateTime(item.scheduledAt));
    pushField(lines, '计划日期', formatDateTime(item.scheduledDate));
    pushField(lines, '开始日期', formatDateTime(item.startDate));
    pushField(lines, '截止时间', formatDateTime(item.dueAt));
    pushField(lines, '截止日期', formatDateTime(item.dueDate));
    for (const field of ['scheduledAt', 'scheduledDate', 'startDate', 'dueAt', 'dueDate']) used.add(field);
  }

  // 已完成历史默认不重复输出优先级；未完成任务或 View 明确展示 priority 时保留。
  if (item.priority && !isGroupedBy(ctx, 'priority') && (status === 'open' || viewExplicitlyShows(ctx, 'priority'))) {
    pushField(lines, '优先级', item.priority, 'priority');
    used.add('priority');
  }

  for (const field of viewExtraFields(item, ctx, used)) {
    if (isGroupedBy(ctx, field)) continue;
    const value = readField(item, field);
    if (isEmpty(value) || (field === 'content' && compactText(value) === resolveMainText(item, ctx))) continue;
    pushField(lines, fieldLabel(field), value, field);
  }

  if (ctx.config.taskSessionMode === 'expanded') {
    const sessions = filteredTaskSessions(item, ctx).filter((session) => Number(session.sessionDurationMinutes) > 0);
    if (sessions.length > 0) {
      lines.push('  - 执行：');
      for (const session of sessions) {
        const start = formatDateTime(session.sessionStartedAt);
        const end = formatDateTime(session.sessionEndedAt);
        const sameDay = dateOnly(start) && dateOnly(start) === dateOnly(end);
        const range = sameDay ? `${start.slice(11)}–${end.slice(11)}` : `${start}–${end}`;
        lines.push(`    - ${range} · ${formatMinutes(Number(session.sessionDurationMinutes))}`);
      }
    }
  }
  return lines;
}

function renderEnergyRecord(item: RecordViewItem, ctx: ExportRuntimeContext): string[] {
  const lines = [`- ${resolveMainText(item, ctx)}`];
  const snapshot = readEnergyItemSnapshot(item);
  if (!isGroupedBy(ctx, 'goalPath')) pushField(lines, '目标', item.goalPath, 'goalPath');
  if (!snapshot) {
    if (!isGroupedBy(ctx, 'date')) pushField(lines, '日期', item.date, 'date');
    return lines;
  }
  if (!isGroupedBy(ctx, 'date') && (snapshot.date || snapshot.time)) {
    pushField(lines, '时间', `${snapshot.date || ''}${snapshot.time ? ` ${snapshot.time}` : ''}`.trim());
  }
  pushField(lines, '精力', snapshot.score);
  pushField(lines, '脑力', snapshot.brainScore);
  pushField(lines, '体力', snapshot.physicalScore);
  return lines;
}

export function renderGenericRecord(item: RecordViewItem, ctx: ExportRuntimeContext, forceType = false): string[] {
  if (item.recordType === 'task') return renderTask(item, ctx);
  if (item.recordType === 'energy') return renderEnergyRecord(item, ctx);

  const lines = [`- ${resolveMainText(item, ctx)}`];
  const used = new Set<string>(['primaryText', 'title']);
  const groupedByRecordType = ctx.groupFields.some((field) => normalizeFieldKey(field) === 'recordType');
  if ((forceType || ctx.recordTypeCount > 1) && !groupedByRecordType) pushField(lines, '类型', getRecordTypePresentation(item.recordType).label);

  for (const field of RECORD_PROFILE_FIELDS[item.recordType] || ['goalPath', 'date', 'content']) {
    used.add(field);
    if (isGroupedBy(ctx, field)) continue;
    const value = readField(item, field);
    if (isEmpty(value) || (field === 'content' && compactText(value) === resolveMainText(item, ctx))) continue;
    pushField(lines, fieldLabel(field), value, field);
  }
  for (const field of viewExtraFields(item, ctx, used)) {
    if (isGroupedBy(ctx, field)) continue;
    const value = readField(item, field);
    if (isEmpty(value) || (field === 'content' && compactText(value) === resolveMainText(item, ctx))) continue;
    pushField(lines, fieldLabel(field), value, field);
  }
  return lines;
}

function headingLabel(node: GroupNode): string {
  return normalizeFieldKey(node.field) === 'recordType'
    ? getRecordTypePresentation(node.key).label
    : node.label || node.key || '未分类';
}

function appendGroupTree(lines: string[], nodes: GroupNode[], ctx: ExportRuntimeContext, level = 0): void {
  for (const node of nodes) {
    if (node.field !== '__all__') {
      lines.push(`${'#'.repeat(Math.min(6, level + 2))} ${headingLabel(node)}`, '');
    }
    if (node.children?.length) appendGroupTree(lines, node.children, ctx, level + 1);
    if (node.items?.length) {
      for (const item of node.items) if (!INTERNAL_RECORD_TYPES.has(item.recordType)) lines.push(...renderGenericRecord(item, ctx));
      lines.push('');
    }
  }
}

export function titleLines(ctx: ExportRuntimeContext): string[] {
  const title = compactText(ctx.request.viewInstance?.title);
  return title ? [`# ${title}`, ''] : [];
}

export function exportRecordList(ctx: ExportRuntimeContext, inputItems = ctx.request.items, groupFields = ctx.groupFields): string {
  const items = inputItems.filter((item) => !INTERNAL_RECORD_TYPES.has(item.recordType));
  const lines = titleLines(ctx);
  if (!items.length) return lines.concat(['没有可导出的记录']).join('\n').trim();
  if (!groupFields.length) {
    for (const item of items) lines.push(...renderGenericRecord(item, ctx));
  } else {
    appendGroupTree(lines, groupItemsByFields(items, groupFields, { goals: ctx.request.goals }), ctx);
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function escapeTable(value: unknown): string {
  return compactText(value).replace(/\|/g, '\\|');
}

function tableCell(item: RecordViewItem, field: string, ctx: ExportRuntimeContext): string {
  if (field === 'primaryText') return escapeTable(resolveMainText(item, ctx));
  if (field === '__actualDuration') {
    if (item.recordType !== 'task') return '';
    const actual = taskActualDuration(item, ctx);
    return actual.minutes != null && actual.minutes > 0 ? escapeTable(formatMinutes(actual.minutes)) : '';
  }
  if (field === '__expectedDuration') {
    const expected = Number(item.expectedDurationMinutes);
    return item.recordType === 'task' && Number.isFinite(expected) && expected > 0 ? escapeTable(formatMinutes(expected)) : '';
  }
  const value = readField(item, field);
  return isEmpty(value) ? '' : escapeTable(formatFieldValue(field, value));
}

export function exportMarkdownTable(ctx: ExportRuntimeContext): string {
  const items = ctx.request.items.filter((item) => !INTERNAL_RECORD_TYPES.has(item.recordType));
  const lines = titleLines(ctx);
  if (!items.length) return lines.concat(['没有可导出的记录']).join('\n').trim();

  const configured = (ctx.request.viewInstance?.fields || []).map(normalizeFieldKey).filter((field) => field && !TECHNICAL_FIELDS.has(field));
  const columns = Array.from(new Set(['primaryText', ...configured.filter((field) => !['title', 'primaryText'].includes(field))]));
  if (columns.length === 1) columns.push('recordType', 'goalPath', 'date');
  if (items.some((item) => item.recordType === 'task')) columns.push('__actualDuration', '__expectedDuration');
  const uniqueColumns = Array.from(new Set(columns));
  const labels = uniqueColumns.map((field) => field === '__actualDuration' ? '实际时长' : field === '__expectedDuration' ? '预计时长' : fieldLabel(field));

  lines.push(`| ${labels.join(' | ')} |`, `| ${labels.map(() => '---').join(' | ')} |`);
  for (const item of items) lines.push(`| ${uniqueColumns.map((field) => tableCell(item, field, ctx)).join(' | ')} |`);
  return lines.join('\n').trim();
}
