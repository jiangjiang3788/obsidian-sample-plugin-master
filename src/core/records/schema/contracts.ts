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
  f('记录ID', 'identity', 'target', 'record-id', '稳定的记录标识；不会根据文件路径或行号推导。', { required: true, aliases: ['recordId', 'id'] }),
  f('记录类型', 'identity', 'target', 'enum', '业务记录类型标识。', { required: true, aliases: ['recordType'] }),
] as const;

const GOAL = [
  f('目标', 'canonical-reference', 'target', 'string', '规范且可读的目标路径；路径本身就是目标标识。', { aliases: ['goalPath'] }),
] as const;
const DATE = f('日期', 'business-fact', 'target', 'date', '记录发生日期或业务日期。', { aliases: ['date'] });
const CONTENT = f('内容', 'business-fact', 'target', 'string', '用户填写的主要记录内容。', { aliases: ['content', '任务内容'] });
const TAGS = f('标签', 'business-fact', 'target', 'tags', '用户填写的标签；为空时省略。', { aliases: ['tags'] });
const ICON = f('图标', 'display-snapshot', 'target', 'string', '历史显示快照；后续规则决定是否可由显示样式替代。', { aliases: ['icon'] });


const GENERIC_COMMON = [...ENVELOPE, ...GOAL, DATE] as const;

export const THOUGHT_SCHEMA: RecordSchemaContract = {
  contractVersion: RECORD_SCHEMA_CONTRACT_VERSION,
  recordType: 'thought',
  displayName: '思考',
  family: 'generic',
  capabilities: { userVisible: true, goalBindable: true, dated: true, customFields: true },
  recordFields: [...GENERIC_COMMON, TAGS, ICON, CONTENT],
};

export const FEELING_SCHEMA: RecordSchemaContract = {
  contractVersion: RECORD_SCHEMA_CONTRACT_VERSION,
  recordType: 'feeling',
  displayName: '感受',
  family: 'generic',
  capabilities: { userVisible: true, goalBindable: true, dated: true, customFields: true },
  recordFields: [...GENERIC_COMMON, TAGS, ICON, CONTENT],
};

export const EVENT_SCHEMA: RecordSchemaContract = {
  contractVersion: RECORD_SCHEMA_CONTRACT_VERSION,
  recordType: 'event',
  displayName: '事件',
  family: 'generic',
  capabilities: { userVisible: true, goalBindable: true, dated: true, customFields: true },
  recordFields: [...GENERIC_COMMON, TAGS, ICON, CONTENT],
};

export const HABIT_SCHEMA: RecordSchemaContract = {
  contractVersion: RECORD_SCHEMA_CONTRACT_VERSION,
  recordType: 'habit',
  displayName: '打卡',
  family: 'generic',
  capabilities: { userVisible: true, goalBindable: true, dated: true, customFields: true },
  recordFields: [
    ...GENERIC_COMMON,
    f('评分', 'business-fact', 'target', 'number', '习惯打卡的评分或数值。', { aliases: ['rating'] }),
    f('图片', 'business-fact', 'target', 'string', '规范的图片或评分展示值。', { aliases: ['image'] }),
    CONTENT,
  ],
};

function periodRecord(recordType: 'plan' | 'review', displayName: string): RecordSchemaContract {
  return {
    contractVersion: RECORD_SCHEMA_CONTRACT_VERSION,
    recordType,
    displayName,
    family: 'generic',
    capabilities: { userVisible: true, goalBindable: true, dated: true, periodAware: true, customFields: true },
    recordFields: [
      ...GENERIC_COMMON,
      f('周期粒度', 'business-fact', 'target', 'enum', '唯一持久化的周期事实；周期标识和名称由“日期 + 周期粒度”推导。', { aliases: ['periodGranularity'], allowedValues: ['week', 'month', 'quarter', 'year'] }),
      ICON,
      CONTENT,
    ],
  };
}

export const PLAN_SCHEMA = periodRecord('plan', '计划');
export const REVIEW_SCHEMA = periodRecord('review', '总结');

function simpleGoalRecord(recordType: 'blocker' | 'milestone', displayName: string): RecordSchemaContract {
  return {
    contractVersion: RECORD_SCHEMA_CONTRACT_VERSION,
    recordType,
    displayName,
    family: 'generic',
    capabilities: { userVisible: true, goalBindable: true, dated: true, customFields: true },
    recordFields: [...GENERIC_COMMON, ICON, CONTENT],
  };
}

export const BLOCKER_SCHEMA = simpleGoalRecord('blocker', '阻碍');
export const MILESTONE_SCHEMA = simpleGoalRecord('milestone', '里程碑');

const TASK_DEMAND_FIELDS = [
  f('优先级', 'domain-fact', 'target', 'enum', '用户设置的任务优先级。', { aliases: ['priority'], allowedValues: ['lowest', 'low', 'medium', 'high', 'highest'] }),
  f('重要程度', 'domain-fact', 'target', 'enum', '艾森豪威尔重要程度分类；缺失表示未分类。', { aliases: ['importance'], allowedValues: ['important', 'normal'] }),
  f('紧急程度', 'domain-fact', 'target', 'enum', '艾森豪威尔紧急程度分类；缺失表示未分类。', { aliases: ['urgency'], allowedValues: ['urgent', 'normal'] }),
  f('预计时长', 'domain-fact', 'target', 'number', '用户设置的预计时长（分钟）。手工任务时间段缺少结束时间时可用它补全；多段计时历史仍以任务计时记录为准。', { aliases: ['expectedDurationMinutes'] }),
  f('精力要求', 'domain-fact', 'target', 'enum', '设置的综合精力要求。', { aliases: ['energyDemand'], allowedValues: ['low', 'medium', 'high'] }),
  f('脑力要求', 'domain-fact', 'target', 'enum', '设置的脑力要求。', { aliases: ['brainDemand'], allowedValues: ['low', 'medium', 'high'] }),
  f('体力要求', 'domain-fact', 'target', 'enum', '设置的体力要求。', { aliases: ['physicalDemand'], allowedValues: ['low', 'medium', 'high'] }),
  f('可用场景', 'domain-fact', 'target', 'string', '任务实际可执行的场景；为空或“任意”表示不限制。', { aliases: ['availabilityContexts'] }),
  f('恢复意图', 'domain-fact', 'omit-default', 'boolean', '任务明确以恢复精力为目的时启用。', { aliases: ['recoveryIntent'], defaultValue: false }),
] as const;


export const TASK_SCHEMA: RecordSchemaContract = {
  contractVersion: RECORD_SCHEMA_CONTRACT_VERSION,
  recordType: 'task',
  displayName: '任务',
  family: 'task-domain',
  capabilities: { userVisible: true, goalBindable: true, dated: true, statusful: true, customFields: true },
  recordFields: [
    ...ENVELOPE,
    f('状态', 'domain-fact', 'target', 'enum', '任务生命周期状态。', { required: true, aliases: ['status'], allowedValues: ['open', 'done', 'cancelled', 'skipped'] }),
    f('创建于', 'domain-fact', 'target', 'datetime', '任务创建时间。', { aliases: ['createdAt'] }),
    ...GOAL,
    f('系列ID', 'canonical-reference', 'target', 'record-id', '可选的任务系列引用。', { aliases: ['seriesId'] }),
    f('计划时间', 'domain-fact', 'target', 'datetime', '计划执行时间。', { aliases: ['scheduledAt'] }),
    f('开始时间', 'domain-fact', 'target', 'datetime', '旧版或手工任务时间段的开始时间。新计划使用计划时间；实际执行使用任务计时记录。', { aliases: ['startAt'] }),
    f('结束时间', 'domain-fact', 'target', 'datetime', '旧版或手工任务时间段的结束时间。为兼容保留；实际执行使用任务计时记录。', { aliases: ['endAt'] }),
    f('截止时间', 'domain-fact', 'target', 'datetime', '截止时间。', { aliases: ['dueAt'] }),
    f('计划日期', 'domain-fact', 'target', 'date', '当前记录使用的仅日期计划执行信息。', { aliases: ['scheduledDate'] }),
    f('开始日期', 'domain-fact', 'target', 'date', '当前记录使用的仅日期开始信息。', { aliases: ['startDate'] }),
    f('截止日期', 'domain-fact', 'target', 'date', '当前记录使用的仅日期截止信息。', { aliases: ['dueDate'] }),
    f('完成于', 'domain-fact', 'target', 'datetime', '任务完成时间或日期。', { aliases: ['completedAt'] }),
    f('取消于', 'domain-fact', 'target', 'datetime', '任务取消时间或日期。', { aliases: ['cancelledAt'] }),
    f('跳过于', 'domain-fact', 'target', 'datetime', '重复任务本次跳过的时间或日期。', { aliases: ['skippedAt'] }),
    ...TASK_DEMAND_FIELDS,
    f('内容', 'domain-fact', 'target', 'string', '任务意图或内容。', { aliases: ['content', '任务内容'] }),
  ],
};

export const TASK_SERIES_SCHEMA: RecordSchemaContract = {
  contractVersion: RECORD_SCHEMA_CONTRACT_VERSION,
  recordType: 'task-series',
  displayName: '任务系列',
  family: 'task-domain',
  capabilities: { userVisible: false, goalBindable: true, dated: true, statusful: true },
  recordFields: [
    ...ENVELOPE,
    f('状态', 'domain-fact', 'target', 'enum', '任务系列生命周期状态。', { required: true, aliases: ['status'], allowedValues: ['active', 'stopped'] }),
    ...GOAL,
    ...TASK_DEMAND_FIELDS,
    f('重复单位', 'domain-fact', 'target', 'enum', '结构化重复单位。', { required: true, aliases: ['recurrenceUnit'], allowedValues: ['day', 'week', 'month', 'quarter', 'year'] }),
    f('重复间隔', 'domain-fact', 'target', 'number', '结构化重复间隔。', { required: true, aliases: ['recurrenceInterval'], defaultValue: 1 }),
    f('重复锚点', 'domain-fact', 'target', 'enum', '结构化重复锚点。', { required: true, aliases: ['recurrenceAnchor'], allowedValues: ['scheduled', 'start', 'due', 'completion'], defaultValue: 'scheduled' }),
    f('系列开始日期', 'domain-fact', 'target', 'date', '系列锚点或开始日期。', { aliases: ['seriesStartDate'] }),
    f('当前任务ID', 'canonical-reference', 'target', 'record-id', '当前活动任务引用。', { aliases: ['currentTaskId'] }),
    f('滚动策略', 'domain-fact', 'omit-default', 'enum', '滚动策略；当前仅支持并默认使用延续策略。', { aliases: ['rolloverPolicy'], allowedValues: ['carry'], defaultValue: 'carry' }),
    f('内容', 'domain-fact', 'target', 'string', '长期重复任务定义。', { aliases: ['content'] }),
  ],
};

export const TASK_SESSION_SCHEMA: RecordSchemaContract = {
  contractVersion: RECORD_SCHEMA_CONTRACT_VERSION,
  recordType: 'task-session',
  displayName: '任务工作块',
  family: 'internal-history',
  capabilities: { userVisible: false, goalBindable: true, dated: true, executionHistory: true },
  recordFields: [
    ...ENVELOPE,
    f('任务ID', 'canonical-reference', 'target', 'record-id', '已执行任务的引用。', { required: true, aliases: ['taskId'] }),
    f('系列ID', 'canonical-reference', 'target', 'record-id', '可选的任务系列引用。', { aliases: ['seriesId'] }),
    ...GOAL,
    f('开始于', 'domain-fact', 'target', 'datetime', '本次实际执行开始时间。', { required: true, aliases: ['sessionStartedAt'] }),
    f('结束于', 'domain-fact', 'target', 'datetime', '本次实际执行结束时间。', { required: true, aliases: ['sessionEndedAt'] }),
    f('时长', 'domain-fact', 'target', 'number', '本次实际执行时长（分钟）。', { required: true, aliases: ['sessionDurationMinutes'] }),
    f('结果', 'domain-fact', 'target', 'enum', '本次执行结果。', { required: true, aliases: ['sessionResult'], allowedValues: ['work-block-ended', 'task-completed'] }),
    f('来源', 'measurement-provenance', 'target', 'enum', '实际执行记录来源。', { required: true, aliases: ['sessionSource'], allowedValues: ['timer', 'energy-view', 'timeline', 'unknown'] }),
    f('建议时长', 'domain-fact', 'target', 'number', '执行时的建议时长快照。', { aliases: ['suggestedDurationMinutes'] }),
    f('开始精力记录ID', 'canonical-reference', 'target', 'record-id', '执行开始时的精力快照。', { aliases: ['startEnergyRecordId'] }),
    f('结束精力记录ID', 'canonical-reference', 'target', 'record-id', '执行结束后关联的精力快照。', { aliases: ['endEnergyRecordId'] }),
    f('精力变化', 'domain-fact', 'target', 'number', '关联的综合精力变化。', { aliases: ['energyDelta'] }),
    f('脑力变化', 'domain-fact', 'target', 'number', '关联的脑力变化。', { aliases: ['brainDelta'] }),
    f('体力变化', 'domain-fact', 'target', 'number', '关联的体力变化。', { aliases: ['physicalDelta'] }),
  ],
};

export const ENERGY_SCHEMA: RecordSchemaContract = {
  contractVersion: RECORD_SCHEMA_CONTRACT_VERSION,
  recordType: 'energy',
  displayName: '精力',
  family: 'energy-domain',
  capabilities: { userVisible: true, goalBindable: true, dated: true, subtypeAware: true, customFields: true },
  recordFields: [
    ...ENVELOPE,
    f('记录子类型', 'domain-fact', 'target', 'enum', '精力记录子类型。', { required: true, aliases: ['recordSubtype'], allowedValues: ['snapshot', 'change', 'recovery', 'depletion', 'stop'] }),
    ...GOAL,
    DATE,
    f('时间', 'business-fact', 'target', 'string', '已知时使用的精力观测时间。', { aliases: ['time'] }),
    f('时段', 'business-fact', 'target', 'string', '无法确定准确时间时使用的精力观测时段。', { aliases: ['period'] }),
    f('精力值', 'domain-fact', 'target', 'number', '规范的 0–100 综合精力分数。', { aliases: ['score'] }),
    f('脑力精力', 'domain-fact', 'target', 'number', '详细脑力分数。', { aliases: ['brainScore'] }),
    f('体力精力', 'domain-fact', 'target', 'number', '详细体力分数。', { aliases: ['physicalScore'] }),
    f('综合算法', 'measurement-provenance', 'target', 'string', '详细分数的综合算法。', { aliases: ['aggregateMethod'] }),
    f('评分模式', 'measurement-provenance', 'target', 'enum', '精力分数的记录方式。', { aliases: ['scoreMode'], allowedValues: ['quick', 'detailed', 'percent'] }),
    f('记录方式', 'measurement-provenance', 'target', 'enum', '实时记录或回顾补记。', { aliases: ['captureMode'], allowedValues: ['realtime', 'retrospective'] }),
    f('时间精度', 'measurement-provenance', 'target', 'enum', '观测时间精度。', { aliases: ['timePrecision'], allowedValues: ['exact', 'approximate', 'period', 'day'] }),
    f('记录时间', 'measurement-provenance', 'target', 'datetime', '可用时记录实际录入时间。', { aliases: ['recordedAt'] }),
    f('来源', 'measurement-provenance', 'target', 'string', '记录入口或来源。', { aliases: ['source'] }),
  ],
};

export const RECORD_SCHEMA_CONTRACTS: readonly RecordSchemaContract[] = [
  THOUGHT_SCHEMA,
  FEELING_SCHEMA,
  EVENT_SCHEMA,
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
