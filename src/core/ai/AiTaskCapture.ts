import { readOptionText } from '../semantics/option';
import { normalizeTaskStatus, type TaskStatus } from '../records/task/taskStatus';

/** External AI labels are input aliases, never additional persisted Task states. */
const AI_TASK_STATUS_ALIASES: Readonly<Record<string, TaskStatus>> = {
  '已完成': 'done', '完成': 'done', '完成了': 'done',
  'completed': 'done', 'complete': 'done', 'finished': 'done',
  '未完成': 'open', '未开始': 'open', '待办': 'open', '待完成': 'open',
  '进行中': 'open', '未做完': 'open', 'todo': 'open', 'pending': 'open',
  'in_progress': 'open', 'in progress': 'open',
  '已取消': 'cancelled', '取消': 'cancelled', 'canceled': 'cancelled',
  '已跳过': 'skipped', '跳过': 'skipped',
};

export function normalizeAiTaskStatus(value: unknown): TaskStatus | null {
  const option = readOptionText(value);
  // The canonical value has priority over a stale/contradictory display label.
  for (const raw of [option.value, option.label]) {
    const token = raw.trim().toLowerCase();
    const canonical = normalizeTaskStatus(token);
    if (canonical) return canonical;
    const label = token.replace(/^(?:✅|⏳|❌|⏭️?)\s*/u, '');
    const alias = Object.prototype.hasOwnProperty.call(AI_TASK_STATUS_ALIASES, label)
      ? AI_TASK_STATUS_ALIASES[label]
      : undefined;
    if (alias) return alias;
  }
  return null;
}

/**
 * Normalize structured AI values, not arbitrary prose. A word such as “完成” in
 * “明天完成周报” or “还没完成” must never itself complete a Task.
 * Unknown values stay visible and are rejected at the domain submit boundary.
 */
export function normalizeAiTaskCaptureFields(values: Record<string, unknown>): Record<string, unknown> {
  const next = { ...values };
  const raw = next.status ?? next['状态'];
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    next.status = normalizeAiTaskStatus(raw) ?? raw;
    delete next['状态'];
  }
  return next;
}

/** Actual execution fields accepted by the shared completed-Task create flow. */
export const AI_TASK_EXECUTION_FIELDS = [
  { key: 'startAt', label: '实际开始（已完成任务）', type: 'datetime' },
  { key: 'endAt', label: '实际结束（已完成任务）', type: 'datetime' },
  { key: 'completedAt', label: '任务完成时间', type: 'datetime' },
] as const;
