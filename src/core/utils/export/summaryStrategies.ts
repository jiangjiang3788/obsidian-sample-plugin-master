import type { RecordViewItem } from '@/core/records/RecordEntity';
import { getTaskStatus } from '@/core/records/task/taskStatus';
import { deriveEisenhowerQuadrant } from '@/core/records/task/taskQuadrant';
import { getRecordTypePresentation } from '@/core/recordTypes/public';
import { readEnergyItemSnapshot } from '@/core/energy/public';
import { renderTask, titleLines } from './recordRenderer';
import {
  INTERNAL_RECORD_TYPES,
  QUADRANT_LABELS,
  compactText,
  formatNumber,
  imageDisplay,
  inRange,
  itemDate,
  localDateText,
  rootGoal,
  type ExportRuntimeContext,
} from './model';

function statisticMetricMatch(item: RecordViewItem, metric: string): boolean {
  if (metric === 'taskCount') return item.recordType === 'task';
  if (metric === 'doneTaskCount') return item.recordType === 'task' && getTaskStatus(item) === 'done';
  if (metric === 'habitCount') return item.recordType === 'habit';
  if (metric === 'blockerCount') return item.recordType === 'blocker';
  if (metric === 'milestoneCount') return item.recordType === 'milestone';
  return !INTERNAL_RECORD_TYPES.has(item.recordType);
}

export function exportStatistics(ctx: ExportRuntimeContext): string {
  const metric = String(ctx.request.viewInstance?.viewConfig?.metric || 'recordCount');
  const labels: Record<string, string> = {
    recordCount: '记录数', taskCount: '任务数', doneTaskCount: '已完成任务', habitCount: '打卡数', blockerCount: '阻碍项', milestoneCount: '里程碑',
  };
  const filtered = ctx.request.items.filter((item) => statisticMetricMatch(item, metric));
  const counts = new Map<string, number>();
  for (const item of filtered) counts.set(rootGoal(item), (counts.get(rootGoal(item)) || 0) + 1);
  const topN = Math.max(0, Number(ctx.request.viewInstance?.viewConfig?.topN) || 0);
  let rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'));
  if (topN > 0) rows = rows.slice(0, topN);

  const lines = titleLines(ctx);
  lines.push(`- 指标：${labels[metric] || metric}`, `- 总计：${filtered.length}`);
  if (rows.length) {
    lines.push('', '## 分目标');
    for (const [goal, count] of rows) lines.push(`- ${goal}：${count}`);
  }
  return lines.join('\n').trim();
}

export function exportHeatmap(ctx: ExportRuntimeContext): string {
  const lines = titleLines(ctx);
  const configuredGoals = new Set((ctx.request.viewInstance?.viewConfig?.goalPaths || []).map((value: unknown) => String(value || '').trim()).filter(Boolean));
  const sourceType = String(ctx.request.viewInstance?.viewConfig?.sourceRecordTypeId || '').replace(/^core\./, '').trim();
  const byGoal = new Map<string, RecordViewItem[]>();
  for (const item of ctx.request.items.filter((row) => !INTERNAL_RECORD_TYPES.has(row.recordType))) {
    if (sourceType && item.recordType !== sourceType) continue;
    const rawGoal = compactText(item.goalPath);
    if (configuredGoals.size > 0 && !configuredGoals.has(rawGoal)) continue;
    const goal = rawGoal || '未分类';
    const rows = byGoal.get(goal) || [];
    rows.push(item); byGoal.set(goal, rows);
  }
  const configuredGoalOrder = (ctx.request.viewInstance?.viewConfig?.goalPaths || []).map(String);
  const orderedGoals = [...byGoal.keys()].sort((a, b) => {
    const ai = configuredGoalOrder.indexOf(a); const bi = configuredGoalOrder.indexOf(b);
    if (ai >= 0 || bi >= 0) return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi);
    return a.localeCompare(b, 'zh-CN');
  });
  for (const goal of orderedGoals) {
    lines.push(`## ${goal}`, '');
    const byDate = new Map<string, RecordViewItem[]>();
    for (const item of byGoal.get(goal) || []) {
      const date = itemDate(item) || '未标日期';
      const rows = byDate.get(date) || [];
      rows.push(item); byDate.set(date, rows);
    }
    for (const [date, rows] of [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const ratings = rows.map((row) => row.rating).filter((value) => value != null).map(String);
      const images = rows.map((row) => imageDisplay(row.image)).filter(Boolean);
      const parts = [`${rows.length} 次`];
      if (ratings.length) parts.push(`评分 ${ratings.join('、')}`);
      if (images.length) parts.push(images.join(' '));
      lines.push(`- ${date}：${parts.join(' · ')}`);
    }
    lines.push('');
  }
  if (!orderedGoals.length) lines.push('没有可导出的打卡记录');
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function exportProgress(ctx: ExportRuntimeContext): string {
  const lines = titleLines(ctx);
  const byGoal = new Map<string, RecordViewItem[]>();
  for (const item of ctx.request.items.filter((row) => !INTERNAL_RECORD_TYPES.has(row.recordType))) {
    const goal = rootGoal(item);
    const rows = byGoal.get(goal) || [];
    rows.push(item); byGoal.set(goal, rows);
  }
  lines.push(`- 目标数：${byGoal.size}`, `- 记录数：${ctx.request.items.filter((item) => !INTERNAL_RECORD_TYPES.has(item.recordType)).length}`);
  for (const [goal, rows] of [...byGoal.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'zh-CN'))) {
    lines.push('', `## ${goal}`);
    const typeCounts = new Map<string, number>();
    for (const item of rows) {
      const label = getRecordTypePresentation(item.recordType).label;
      typeCounts.set(label, (typeCounts.get(label) || 0) + 1);
    }
    const doneTasks = rows.filter((item) => item.recordType === 'task' && getTaskStatus(item) === 'done').length;
    lines.push(`- 记录：${rows.length}`);
    if (doneTasks) lines.push(`- 已完成任务：${doneTasks}`);
    lines.push(`- 类型：${[...typeCounts.entries()].map(([label, count]) => `${label} ${count}`).join('、')}`);
  }
  return lines.join('\n').trim();
}

function energyOccurrence(item: RecordViewItem): string {
  const snapshot = readEnergyItemSnapshot(item);
  return snapshot ? `${snapshot.date || ''}T${snapshot.time || ''}` : '';
}

export function exportEnergy(ctx: ExportRuntimeContext): string {
  const requestedGoal = compactText(ctx.request.viewInstance?.viewConfig?.goalPath);
  const energyItems = ctx.request.items.filter((item) => {
    if (item.recordType !== 'energy' || (requestedGoal && compactText(item.goalPath) !== requestedGoal)) return false;
    const snapshot = readEnergyItemSnapshot(item);
    if (!snapshot) return false;
    if (!ctx.request.dateRange) return true;
    return inRange(`${snapshot.date || ''}T${snapshot.time || '00:00'}`, ctx.request.dateRange)
      || (snapshot.date ? localDateText(ctx.request.dateRange[0]) <= snapshot.date && snapshot.date <= localDateText(ctx.request.dateRange[1]) : false);
  });
  const lines = titleLines(ctx);
  if (!energyItems.length) return lines.concat(['没有可导出的精力记录']).join('\n').trim();

  const byGoal = new Map<string, RecordViewItem[]>();
  for (const item of energyItems) {
    const goal = compactText(item.goalPath) || '未分类';
    const rows = byGoal.get(goal) || [];
    rows.push(item); byGoal.set(goal, rows);
  }
  lines.push(`- 样本数：${energyItems.length}`);
  for (const [goal, rows] of [...byGoal.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'))) {
    const snapshots = [...rows].sort((a, b) => energyOccurrence(b).localeCompare(energyOccurrence(a)))
      .map(readEnergyItemSnapshot).filter((value): value is NonNullable<ReturnType<typeof readEnergyItemSnapshot>> => !!value);
    const latest = snapshots[0];
    const average = snapshots.reduce((sum, row) => sum + row.score, 0) / snapshots.length;
    lines.push('', `## ${goal}`, `- 样本：${snapshots.length}`, `- 平均精力：${formatNumber(Math.round(average * 10) / 10)}`);
    if (latest) lines.push(`- 最近：${latest.score} · ${`${latest.date || ''} ${latest.time || ''}`.trim()}`);
    const recent = snapshots.slice(0, 5).map((row) => `${row.date || ''}${row.time ? ` ${row.time}` : ''}=${row.score}`.trim());
    if (recent.length) lines.push(`- 最近记录：${recent.join('；')}`);
  }
  return lines.join('\n').trim();
}

export function exportEisenhower(ctx: ExportRuntimeContext): string {
  const lines = titleLines(ctx);
  const columns = new Map<string, RecordViewItem[]>([['q1', []], ['q2', []], ['q3', []], ['q4', []], ['unclassified', []]]);
  for (const item of ctx.request.items) {
    if (item.recordType !== 'task' || getTaskStatus(item) !== 'open') continue;
    columns.get(deriveEisenhowerQuadrant(item))?.push(item);
  }
  let any = false;
  for (const key of ['q1', 'q2', 'q3', 'q4', 'unclassified']) {
    const rows = columns.get(key) || [];
    if (!rows.length) continue;
    any = true;
    lines.push(`## ${QUADRANT_LABELS[key]}`, '');
    for (const item of rows) lines.push(...renderTask(item, ctx));
    lines.push('');
  }
  if (!any) lines.push('没有未完成任务');
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
