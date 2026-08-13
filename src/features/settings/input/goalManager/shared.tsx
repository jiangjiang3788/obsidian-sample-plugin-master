/** @jsxImportSource preact */
import { h } from 'preact';
import type { CycleGranularity } from '@core/goal/public';

export type GoalGranularity = Exclude<CycleGranularity, 'day' | 'custom'>;

export const goalGranularityOptions: Array<{ value: GoalGranularity; label: string }> = [
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'quarter', label: '季度' },
  { value: 'year', label: '年' },
];

export const metricDirectionOptions = [
  { value: 'increase', label: '增加到目标值' },
  { value: 'decrease', label: '降低到目标值' },
  { value: 'maintain', label: '维持目标值' },
  { value: 'boolean', label: '是否达成' },
];


export function pathLeaf(path: string): string {
  return String(path || '').split('/').filter(Boolean).pop() || path;
}

export function metricPresetKey(label: string): string {
  const text = label.toLowerCase();
  if (/完成|done|complete/.test(text)) return 'task.done';
  if (/任务|task/.test(text)) return 'task.total';
  if (/打卡|habit|check/.test(text)) return 'habit.count';
  if (/事件|证据|event|evidence/.test(text)) return 'evidence.count';
  if (/阻碍|风险|blocker|risk/.test(text)) return 'blocker.count';
  if (/里程碑|milestone/.test(text)) return 'milestone.count';
  if (/总结|复盘|review/.test(text)) return 'review.count';
  if (/计划|plan/.test(text)) return 'plan.count';
  return label.trim() || 'goal.metric';
}
