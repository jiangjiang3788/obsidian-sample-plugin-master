import { RECORD_SCHEMA_CONTRACT_VERSION, type RecordFieldContract, type RecordSchemaContract } from './types';

function f(
  key: string,
  role: RecordFieldContract['role'],
  persistence: RecordFieldContract['persistence'],
  valueType: RecordFieldContract['valueType'],
  description: string,
  options: Omit<RecordFieldContract, 'key' | 'role' | 'persistence' | 'valueType' | 'description'> = {},
): RecordFieldContract {
  return { key, role, persistence, valueType, description, ...options };
}

const ENVELOPE = [
  f('记录ID', 'identity', 'target', 'record-id', 'Stable Record identity; never derived from file path or line.', { required: true, aliases: ['recordId', 'id'] }),
  f('记录版本', 'identity', 'target', 'number', 'Persisted Record schema version.', { required: true, aliases: ['schemaVersion'] }),
  f('核心Block', 'identity', 'target', 'enum', 'Business record type discriminator.', { required: true, aliases: ['coreBlock'] }),
] as const;

const GOAL = [
  f('目标ID', 'canonical-reference', 'target', 'goal-id', 'Stable Goal reference and business truth.', { aliases: ['goalId'] }),
  f('目标', 'human-snapshot', 'target', 'string', 'Human-readable Goal snapshot; never used as identity.', { aliases: ['goalPath'] }),
] as const;

const THEME = f('主题', 'business-history', 'target', 'string', 'Historical theme-path snapshot. May reference a theme no longer present in current settings.', { aliases: ['theme', 'themePath'] });
const DATE = f('日期', 'business-fact', 'target', 'date', 'Record occurrence/business date.', { aliases: ['date'] });
const CONTENT = f('内容', 'business-fact', 'target', 'string', 'Primary human-authored Record content.', { aliases: ['content', '正文', 'title', '任务内容', '阻碍', '里程碑'] });
const TAGS = f('标签', 'business-fact', 'target', 'tags', 'User-authored tags. Omit when empty.', { aliases: ['tag', 'tags'] });
const ICON = f('图标', 'display-snapshot', 'target', 'string', 'Historical display snapshot. R5 decides whether displayStyle can replace this.', { aliases: ['icon'] });


const GENERIC_COMMON = [...ENVELOPE, ...GOAL, DATE, THEME] as const;

export const THOUGHT_SCHEMA: RecordSchemaContract = {
  contractVersion: RECORD_SCHEMA_CONTRACT_VERSION,
  coreBlock: 'thought',
  displayName: '思考',
  family: 'generic',
  capabilities: { userVisible: true, goalBindable: true, themeAware: true, dated: true, subtypeAware: true, customFields: true },
  recordFields: [
    ...GENERIC_COMMON,
    f('记录子类型', 'business-fact', 'target', 'enum', 'Thought subtype: 感受 or 思考. This replaces the old 闪念/感受 and 闪念/思考 分类 values.', { aliases: ['recordSubtype', 'subtype'], allowedValues: ['感受', '思考'] }),
    TAGS,
    ICON,
    CONTENT,
  ],
};

export const EVIDENCE_SCHEMA: RecordSchemaContract = {
  contractVersion: RECORD_SCHEMA_CONTRACT_VERSION,
  coreBlock: 'evidence',
  displayName: '事件 / 证据',
  family: 'generic',
  capabilities: { userVisible: true, goalBindable: true, themeAware: true, dated: true, customFields: true },
  recordFields: [...GENERIC_COMMON, TAGS, ICON, CONTENT],
};

export const HABIT_SCHEMA: RecordSchemaContract = {
  contractVersion: RECORD_SCHEMA_CONTRACT_VERSION,
  coreBlock: 'habit',
  displayName: '打卡',
  family: 'generic',
  capabilities: { userVisible: true, goalBindable: true, themeAware: true, dated: true, customFields: true },
  recordFields: [
    ...GENERIC_COMMON,
    f('评分', 'business-fact', 'target', 'number', 'Habit rating/value.', { aliases: ['rating'] }),
    f('图片', 'business-fact', 'target', 'string', 'Canonical image/rating visual value.', { aliases: ['image'] }),
    CONTENT,
  ],
};

function periodRecord(coreBlock: 'plan' | 'review', displayName: string): RecordSchemaContract {
  return {
    contractVersion: RECORD_SCHEMA_CONTRACT_VERSION,
    coreBlock,
    displayName,
    family: 'generic',
    capabilities: { userVisible: true, goalBindable: true, themeAware: true, dated: true, periodAware: true, customFields: true },
    recordFields: [
      ...GENERIC_COMMON,
      f('周期粒度', 'business-fact', 'target', 'enum', 'Only persisted period fact. Period ID/label are derived from 日期 + 周期粒度.', { aliases: ['periodGranularity', 'goalGranularity'], allowedValues: ['week', 'month', 'quarter', 'year'] }),
      ICON,
      CONTENT,
    ],
  };
}

export const PLAN_SCHEMA = periodRecord('plan', '计划');
export const REVIEW_SCHEMA = periodRecord('review', '总结');

function simpleGoalRecord(coreBlock: 'blocker' | 'milestone', displayName: string): RecordSchemaContract {
  return {
    contractVersion: RECORD_SCHEMA_CONTRACT_VERSION,
    coreBlock,
    displayName,
    family: 'generic',
    capabilities: { userVisible: true, goalBindable: true, themeAware: true, dated: true, customFields: true },
    recordFields: [...GENERIC_COMMON, ICON, CONTENT],
  };
}

export const BLOCKER_SCHEMA = simpleGoalRecord('blocker', '阻碍');
export const MILESTONE_SCHEMA = simpleGoalRecord('milestone', '里程碑');

const TASK_DEMAND_FIELDS = [
  f('优先级', 'domain-fact', 'target', 'enum', 'User-declared Task priority.', { aliases: ['priority'], allowedValues: ['lowest', 'low', 'medium', 'high', 'highest'] }),
  f('预计时长', 'domain-fact', 'target', 'number', 'User-declared expected duration in minutes. Actual execution duration belongs to TaskSession.', { aliases: ['expectedDurationMinutes'] }),
  f('精力要求', 'domain-fact', 'target', 'enum', 'Declared overall energy demand.', { aliases: ['energyDemand'], allowedValues: ['low', 'medium', 'high'] }),
  f('脑力要求', 'domain-fact', 'target', 'enum', 'Declared cognitive demand.', { aliases: ['brainDemand'], allowedValues: ['low', 'medium', 'high'] }),
  f('体力要求', 'domain-fact', 'target', 'enum', 'Declared physical demand.', { aliases: ['physicalDemand'], allowedValues: ['low', 'medium', 'high'] }),
  f('可用场景', 'domain-fact', 'target', 'string', 'Execution contexts where the Task can actually be done. Empty or any means unrestricted.', { aliases: ['availabilityContexts'] }),
  f('恢复意图', 'domain-fact', 'omit-default', 'boolean', 'True when the Task is intentionally recovery-oriented.', { aliases: ['recoveryIntent'], defaultValue: false }),
] as const;


export const TASK_SCHEMA: RecordSchemaContract = {
  contractVersion: RECORD_SCHEMA_CONTRACT_VERSION,
  coreBlock: 'task',
  displayName: '任务',
  family: 'task-domain',
  capabilities: { userVisible: true, goalBindable: true, themeAware: true, dated: true, statusful: true, customFields: true },
  recordFields: [
    ...ENVELOPE,
    f('状态', 'domain-fact', 'target', 'enum', 'Task lifecycle state.', { required: true, aliases: ['status'], allowedValues: ['open', 'done', 'cancelled', 'skipped'] }),
    f('创建于', 'domain-fact', 'target', 'datetime', 'Task creation timestamp when created by the v2 writer.', { aliases: ['createdAt'] }),
    ...GOAL,
    THEME,
    f('系列ID', 'canonical-reference', 'target', 'record-id', 'Optional TaskSeries reference.', { aliases: ['seriesId'] }),
    f('计划日期', 'domain-fact', 'target', 'date', 'Scheduled execution date.', { aliases: ['scheduledDate'] }),
    f('开始日期', 'domain-fact', 'target', 'date', 'Declared start date.', { aliases: ['startDate'] }),
    f('截止日期', 'domain-fact', 'target', 'date', 'Due date.', { aliases: ['dueDate'] }),
    f('完成于', 'domain-fact', 'target', 'datetime', 'Task completion timestamp/date.', { aliases: ['completedAt'] }),
    f('取消于', 'domain-fact', 'target', 'datetime', 'Task cancellation timestamp/date.', { aliases: ['cancelledAt'] }),
    f('跳过于', 'domain-fact', 'target', 'datetime', 'Recurring occurrence skipped timestamp/date.', { aliases: ['skippedAt'] }),
    ...TASK_DEMAND_FIELDS,
    f('内容', 'domain-fact', 'target', 'string', 'Task intent/content.', { aliases: ['content', '正文', 'title', '任务内容'] }),
  ],
};

export const TASK_SERIES_SCHEMA: RecordSchemaContract = {
  contractVersion: RECORD_SCHEMA_CONTRACT_VERSION,
  coreBlock: 'task-series',
  displayName: '任务系列',
  family: 'task-domain',
  capabilities: { userVisible: false, goalBindable: true, themeAware: true, dated: true, statusful: true },
  recordFields: [
    ...ENVELOPE,
    f('状态', 'domain-fact', 'target', 'enum', 'TaskSeries lifecycle state.', { required: true, aliases: ['status'], allowedValues: ['active', 'stopped'] }),
    ...GOAL,
    THEME,
    ...TASK_DEMAND_FIELDS,
    f('重复单位', 'domain-fact', 'target', 'enum', 'Structured recurrence unit.', { required: true, aliases: ['recurrenceUnit'], allowedValues: ['day', 'week', 'month', 'quarter', 'year'] }),
    f('重复间隔', 'domain-fact', 'target', 'number', 'Structured recurrence interval.', { required: true, aliases: ['recurrenceInterval'], defaultValue: 1 }),
    f('重复锚点', 'domain-fact', 'target', 'enum', 'Structured recurrence anchor.', { required: true, aliases: ['recurrenceAnchor'], allowedValues: ['scheduled', 'start', 'due', 'completion'], defaultValue: 'scheduled' }),
    f('系列开始日期', 'domain-fact', 'target', 'date', 'Series anchor/start date.', { aliases: ['seriesStartDate'] }),
    f('当前任务ID', 'canonical-reference', 'target', 'record-id', 'Current active occurrence reference.', { aliases: ['currentTaskId'] }),
    f('滚动策略', 'domain-fact', 'omit-default', 'enum', 'Rollover policy; carry is currently the sole/default strategy.', { aliases: ['rolloverPolicy'], allowedValues: ['carry'], defaultValue: 'carry' }),
    f('内容', 'domain-fact', 'target', 'string', 'Long-lived recurring Task definition.', { aliases: ['content', '正文', 'title'] }),
  ],
};

export const TASK_SESSION_SCHEMA: RecordSchemaContract = {
  contractVersion: RECORD_SCHEMA_CONTRACT_VERSION,
  coreBlock: 'task-session',
  displayName: '任务工作块',
  family: 'internal-history',
  capabilities: { userVisible: false, goalBindable: true, themeAware: true, dated: true, executionHistory: true },
  recordFields: [
    ...ENVELOPE,
    f('任务ID', 'canonical-reference', 'target', 'record-id', 'Executed Task reference.', { required: true, aliases: ['taskId'] }),
    f('系列ID', 'canonical-reference', 'target', 'record-id', 'Optional TaskSeries reference.', { aliases: ['seriesId'] }),
    ...GOAL,
    THEME,
    f('开始于', 'domain-fact', 'target', 'datetime', 'Actual session start.', { required: true, aliases: ['sessionStartedAt'] }),
    f('结束于', 'domain-fact', 'target', 'datetime', 'Actual session end.', { required: true, aliases: ['sessionEndedAt'] }),
    f('时长', 'domain-fact', 'target', 'number', 'Actual session duration in minutes.', { required: true, aliases: ['sessionDurationMinutes'] }),
    f('结果', 'domain-fact', 'target', 'enum', 'Session outcome.', { required: true, aliases: ['sessionResult'], allowedValues: ['work-block-ended', 'task-completed'] }),
    f('来源', 'measurement-provenance', 'target', 'enum', 'Execution capture source.', { required: true, aliases: ['sessionSource'], allowedValues: ['timer', 'energy-view', 'unknown'] }),
    f('建议时长', 'domain-fact', 'target', 'number', 'Suggested duration snapshot at execution time.', { aliases: ['suggestedDurationMinutes'] }),
    f('开始精力记录ID', 'canonical-reference', 'target', 'record-id', 'Energy snapshot at session start.', { aliases: ['startEnergyRecordId'] }),
    f('结束精力记录ID', 'canonical-reference', 'target', 'record-id', 'Energy snapshot linked after session.', { aliases: ['endEnergyRecordId'] }),
    f('精力变化', 'domain-fact', 'target', 'number', 'Linked energy delta.', { aliases: ['energyDelta'] }),
    f('脑力变化', 'domain-fact', 'target', 'number', 'Linked cognitive-energy delta.', { aliases: ['brainDelta'] }),
    f('体力变化', 'domain-fact', 'target', 'number', 'Linked physical-energy delta.', { aliases: ['physicalDelta'] }),
  ],
};

export const ENERGY_SCHEMA: RecordSchemaContract = {
  contractVersion: RECORD_SCHEMA_CONTRACT_VERSION,
  coreBlock: 'energy',
  displayName: '精力',
  family: 'energy-domain',
  capabilities: { userVisible: true, goalBindable: true, themeAware: true, dated: true, subtypeAware: true, customFields: true },
  recordFields: [
    ...ENVELOPE,
    f('记录子类型', 'domain-fact', 'target', 'enum', 'Energy domain discriminator.', { required: true, aliases: ['recordSubtype', 'subtype'], allowedValues: ['snapshot', 'change', 'recovery', 'depletion', 'stop'] }),
    ...GOAL,
    DATE,
    f('时间', 'business-fact', 'target', 'string', 'Energy observation time when known.', { aliases: ['time'] }),
    f('时段', 'business-fact', 'target', 'string', 'Energy observation period when exact time is unavailable.', { aliases: ['period'] }),
    THEME,
    f('精力值', 'domain-fact', 'target', 'number', 'Canonical 0-100 energy score.', { aliases: ['score'] }),
    f('脑力精力', 'domain-fact', 'target', 'number', 'Detailed cognitive energy score.', { aliases: ['brainScore'] }),
    f('体力精力', 'domain-fact', 'target', 'number', 'Detailed physical energy score.', { aliases: ['physicalScore'] }),
    f('综合算法', 'measurement-provenance', 'target', 'string', 'Aggregation method for detailed scores.', { aliases: ['aggregateMethod'] }),
    f('评分模式', 'measurement-provenance', 'target', 'enum', 'How the energy score was captured.', { aliases: ['scoreMode'], allowedValues: ['quick', 'detailed', 'percent'] }),
    f('记录方式', 'measurement-provenance', 'target', 'enum', 'Realtime vs retrospective capture.', { aliases: ['captureMode'], allowedValues: ['realtime', 'retrospective'] }),
    f('时间精度', 'measurement-provenance', 'target', 'enum', 'Precision of observation time.', { aliases: ['timePrecision'], allowedValues: ['exact', 'approximate', 'period', 'day'] }),
    f('记录时间', 'measurement-provenance', 'target', 'datetime', 'Actual capture timestamp when available.', { aliases: ['recordedAt'] }),
    f('来源', 'measurement-provenance', 'target', 'string', 'Capture surface/source.', { aliases: ['source'] }),
  ],
};

export const RECORD_SCHEMA_CONTRACTS: readonly RecordSchemaContract[] = [
  THOUGHT_SCHEMA,
  EVIDENCE_SCHEMA,
  HABIT_SCHEMA,
  PLAN_SCHEMA,
  REVIEW_SCHEMA,
  BLOCKER_SCHEMA,
  MILESTONE_SCHEMA,
  TASK_SCHEMA,
  TASK_SERIES_SCHEMA,
  TASK_SESSION_SCHEMA,
  ENERGY_SCHEMA,
];
