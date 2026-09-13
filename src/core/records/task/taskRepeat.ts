/**
 * Build a fresh one-time Task draft from a historical Task occurrence.
 *
 * Repeating an old Task must preserve the historical Record as-is. The new
 * Task keeps user intent/classification/custom fields, while lifecycle,
 * execution, schedule and TaskSeries identity are intentionally reset.
 */
export function buildRepeatedTaskFormData<T extends Record<string, unknown>>(formData: T): T {
  const next: Record<string, unknown> = { ...formData };

  const resetKeys = [
    'id', 'recordId', '记录ID', 'recordType', '记录类型',
    'createdAt', '创建于',
    'completedAt', '完成于', 'cancelledAt', '取消于', 'skippedAt', '跳过于',
    'startAt', '开始时间', 'endAt', '结束时间',
    'scheduledAt', '计划时间', 'scheduledDate', '计划日期',
    'startDate', '开始日期', 'dueAt', '截止时间', 'dueDate', '截止日期',
    'seriesId', '系列ID', 'recurrenceInfo', '周期',
    'recurrenceUnit', '重复单位', 'recurrenceInterval', '重复间隔',
    'recurrenceAnchor', '重复锚点', 'seriesStartDate', '系列开始日期',
    'currentTaskId', '当前任务ID', 'rolloverPolicy', '滚动策略',
  ];

  for (const key of resetKeys) delete next[key];
  next.status = 'open';
  delete next['状态'];
  return next as T;
}
