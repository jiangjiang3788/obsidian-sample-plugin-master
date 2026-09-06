export type RecordFieldOrder = Array<[label: string, keys: string[]]>;

/**
 * Canonical Markdown presentation order for Task records.
 * This is formatting metadata only; business meaning stays in the Task domain/schema.
 */
export const TASK_FIELD_ORDER: RecordFieldOrder = [
  ['状态', ['状态','status']], ['目标', ['目标','goalPath']],
  ['创建于', ['创建于','createdAt']],
  ['开始时间', ['开始时间','startAt']], ['结束时间', ['结束时间','endAt']],
  ['优先级', ['优先级','priority']], ['重要程度', ['重要程度','importance']], ['紧急程度', ['紧急程度','urgency']], ['预计时长', ['预计时长','expectedDurationMinutes']],
  ['精力要求', ['精力要求','energyDemand']], ['脑力要求', ['脑力要求','brainDemand']],
  ['体力要求', ['体力要求','physicalDemand']], ['可用场景', ['可用场景','availabilityContexts']], ['恢复意图', ['恢复意图','recoveryIntent']],
  ['计划时间', ['计划时间','scheduledAt']], ['截止时间', ['截止时间','dueAt']],
  ['计划日期', ['计划日期','scheduledDate']], ['开始日期', ['开始日期','startDate']], ['截止日期', ['截止日期','dueDate']],
  ['完成于', ['完成于','completedAt']], ['取消于', ['取消于','cancelledAt']], ['跳过于', ['跳过于','skippedAt']],
  ['系列ID', ['系列ID','seriesId']],
];

/** Canonical Markdown presentation order for TaskSeries records. */
export const TASK_SERIES_FIELD_ORDER: RecordFieldOrder = [
  ['状态', ['状态','status']], ['目标', ['目标','goalPath']],
  ['优先级', ['优先级','priority']], ['重要程度', ['重要程度','importance']], ['紧急程度', ['紧急程度','urgency']], ['预计时长', ['预计时长','expectedDurationMinutes']],
  ['精力要求', ['精力要求','energyDemand']], ['脑力要求', ['脑力要求','brainDemand']], ['体力要求', ['体力要求','physicalDemand']],
  ['可用场景', ['可用场景','availabilityContexts']], ['恢复意图', ['恢复意图','recoveryIntent']],
  ['重复单位', ['重复单位','recurrenceUnit']], ['重复间隔', ['重复间隔','recurrenceInterval']],
  ['重复锚点', ['重复锚点','recurrenceAnchor']], ['系列开始日期', ['系列开始日期','seriesStartDate']],
  ['当前任务ID', ['当前任务ID','currentTaskId']], ['滚动策略', ['滚动策略','rolloverPolicy']],
];
