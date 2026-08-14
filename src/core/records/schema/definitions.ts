import type { TemplateField } from '@/core/recordInput/CaptureTemplate';
import type { RecordSchemaContract, RecordSchemaDefinition } from './types';
import {
  BLOCKER_SCHEMA,
  ENERGY_SCHEMA,
  EVIDENCE_SCHEMA,
  HABIT_SCHEMA,
  MILESTONE_SCHEMA,
  PLAN_SCHEMA,
  REVIEW_SCHEMA,
  TASK_SCHEMA,
  TASK_SERIES_SCHEMA,
  TASK_SESSION_SCHEMA,
  THOUGHT_SCHEMA,
} from './contracts';

export const RECORD_TYPE_IDS = {
  TASK: 'core.task',
  PLAN: 'core.plan',
  REVIEW: 'core.review',
  THOUGHT: 'core.thought',
  HABIT: 'core.habit',
  EVIDENCE: 'core.evidence',
  BLOCKER: 'core.blocker',
  MILESTONE: 'core.milestone',
  ENERGY: 'core.energy',
  TASK_SERIES: 'internal.task-series',
  TASK_SESSION: 'internal.task-session',
} as const;

const themeField: TemplateField = {
  id: 'core.field.themePath', key: 'themePath', label: '主题', type: 'hierarchicalSingleSelect', semantic: 'themePath',
  semanticType: 'path', hierarchical: true, defaultValue: '{{goal.themePath}}',
};
const dateField: TemplateField = { id: 'core.field.date', key: '日期', label: '日期', type: 'date', semantic: 'date' };
const iconField: TemplateField = { id: 'core.field.icon', key: 'icon', label: '图标', type: 'text', semantic: 'icon' };
const contentField: TemplateField = { id: 'core.field.content', key: '内容', label: '内容', type: 'textarea', semantic: 'body' };

function define(
  contract: RecordSchemaContract,
  capture: Omit<RecordSchemaDefinition, keyof RecordSchemaContract | 'key' | 'system' | 'version'>,
): RecordSchemaDefinition {
  return {
    ...contract,
    ...capture,
    key: contract.coreBlock,
    system: true,
    version: 1,
  };
}

const TASK_FIELDS: TemplateField[] = [
  { id: 'core.task.status', key: 'status', label: '状态', type: 'singleSelect', semantic: 'status', defaultValue: 'open', autoSelectFirst: true, options: [
    { value: 'open', label: '未完成' }, { value: 'done', label: '已完成' }, { value: 'cancelled', label: '已取消' }, { value: 'skipped', label: '已跳过' },
  ] },
  { id: 'core.task.content', key: '任务内容', label: '内容', type: 'text', semantic: 'body' },
  { id: 'core.task.recurrenceUnit', key: 'recurrenceUnit', label: '重复', type: 'singleSelect', semantic: 'recurrence', defaultValue: 'none', autoSelectFirst: true, options: [
    { value: 'none', label: '不重复' }, { value: 'day', label: '天' }, { value: 'week', label: '周' }, { value: 'month', label: '月' }, { value: 'quarter', label: '季' }, { value: 'year', label: '年' },
  ] },
  { id: 'core.task.recurrenceInterval', key: 'recurrenceInterval', label: '重复间隔', type: 'number', min: 1, defaultValue: '1' },

  // 主题属于 GoalTemplate / Goal 上下文：保留为隐藏系统字段参与模板默认值和持久化，不在任务创建表单中直接选择。
  themeField,

  // 以下均属于“更多选项”。时间与任务状态互相独立，填写结束时间不会自动完成任务。
  { id: 'core.task.startAt', key: 'startAt', label: '开始/预计时间', type: 'datetime', semantic: 'date' },
  { id: 'core.task.endAt', key: 'endAt', label: '结束时间', type: 'datetime', semantic: 'date' },
  { id: 'core.task.priority', key: 'priority', label: '优先级', type: 'singleSelect', autoSelectFirst: true, options: [
    { value: 'lowest', label: '最低' }, { value: 'low', label: '低' }, { value: 'medium', label: '中' }, { value: 'high', label: '高' }, { value: 'highest', label: '最高' },
  ] },
  { id: 'core.task.energyDemand', key: 'energyDemand', label: '精力要求', type: 'singleSelect', autoSelectFirst: true, options: [
    { value: 'low', label: '低' }, { value: 'medium', label: '中' }, { value: 'high', label: '高' },
  ] },
  { id: 'core.task.brainDemand', key: 'brainDemand', label: '脑力要求', type: 'singleSelect', autoSelectFirst: true, options: [
    { value: 'low', label: '低' }, { value: 'medium', label: '中' }, { value: 'high', label: '高' },
  ] },
  { id: 'core.task.physicalDemand', key: 'physicalDemand', label: '体力要求', type: 'singleSelect', autoSelectFirst: true, options: [
    { value: 'low', label: '低' }, { value: 'medium', label: '中' }, { value: 'high', label: '高' },
  ] },
  { id: 'core.task.availabilityContexts', key: 'availabilityContexts', label: '可用场景', type: 'multiSelect', options: [
    { value: 'any', label: '任意' }, { value: 'work', label: '工作' }, { value: 'home', label: '家' }, { value: 'commute', label: '通勤' }, { value: 'out', label: '外出' },
  ] },
  { id: 'core.task.recoveryIntent', key: 'recoveryIntent', label: '恢复意图', type: 'boolean' },
];

export const TASK_DEFINITION = define(TASK_SCHEMA, {
  id: RECORD_TYPE_IDS.TASK, name: '任务', categoryKey: '任务', captureMode: 'template', coreBlockId: RECORD_TYPE_IDS.TASK,
  description: '目标下的可执行任务。', fields: TASK_FIELDS,
  targetFile: '01/目标.md', appendUnderHeader: '## {{goalPath}}',
});

function genericTemplate(
  contract: RecordSchemaContract,
  input: { id: string; name: string; categoryKey: string; description: string; targetFile: string; extraFields?: TemplateField[]; period?: boolean },
): RecordSchemaDefinition {
  return define(contract, {
    id: input.id, name: input.name, categoryKey: input.categoryKey, captureMode: 'template', coreBlockId: input.id,
    description: input.description,
    fields: [contentField, themeField, dateField, ...(input.extraFields || []), iconField],
    periodPolicy: input.period ? { enabled: true, granularity: 'week' } : undefined,
    targetFile: input.targetFile,
    appendUnderHeader: '## {{goalPath}}',
  });
}

export const PLAN_DEFINITION = genericTemplate(PLAN_SCHEMA, { id: RECORD_TYPE_IDS.PLAN, name: '计划', categoryKey: '计划', description: '目标周期计划。', targetFile: '01/目标计划.md', period: true });
export const REVIEW_DEFINITION = genericTemplate(REVIEW_SCHEMA, { id: RECORD_TYPE_IDS.REVIEW, name: '总结', categoryKey: '总结', description: '目标复盘总结。', targetFile: '01/目标总结.md', period: true });
export const THOUGHT_DEFINITION = genericTemplate(THOUGHT_SCHEMA, { id: RECORD_TYPE_IDS.THOUGHT, name: '思考', categoryKey: '思考', description: '目标相关思考。', targetFile: '01/目标思考.md' });
export const HABIT_DEFINITION = genericTemplate(HABIT_SCHEMA, {
  id: RECORD_TYPE_IDS.HABIT, name: '打卡', categoryKey: '打卡', description: '目标习惯或进度打卡。', targetFile: '01/目标打卡.md',
  extraFields: [{ id: 'core.habit.rating', key: '评分', label: '评分', type: 'rating', semantic: 'rating' }],
});
export const EVIDENCE_DEFINITION = genericTemplate(EVIDENCE_SCHEMA, { id: RECORD_TYPE_IDS.EVIDENCE, name: '事件', categoryKey: '事件', description: '目标相关事件、证据和外部反馈。', targetFile: '01/目标事件.md' });
export const BLOCKER_DEFINITION = genericTemplate(BLOCKER_SCHEMA, { id: RECORD_TYPE_IDS.BLOCKER, name: '阻碍项', categoryKey: '阻碍项', description: '目标推进过程中的阻碍和风险。', targetFile: '01/目标阻碍.md' });
export const MILESTONE_DEFINITION = genericTemplate(MILESTONE_SCHEMA, { id: RECORD_TYPE_IDS.MILESTONE, name: '里程碑', categoryKey: '里程碑', description: '目标阶段成果和重要节点。', targetFile: '01/目标里程碑.md' });

export const ENERGY_DEFINITION = define(ENERGY_SCHEMA, {
  id: RECORD_TYPE_IDS.ENERGY, name: '精力', categoryKey: '精力', captureMode: 'direct',
  description: '目标绑定的精力状态记录；不创建 GoalTemplate，使用直接采集协议。',
  fields: [], targetFile: '01/目标精力.md', appendUnderHeader: '## {{goalPath}}',
});

export const TASK_SERIES_DEFINITION = define(TASK_SERIES_SCHEMA, {
  id: RECORD_TYPE_IDS.TASK_SERIES, name: '任务系列', categoryKey: '任务系列', captureMode: 'internal',
  description: '循环任务的长期领域定义。', fields: [], targetFile: '',
});
export const TASK_SESSION_DEFINITION = define(TASK_SESSION_SCHEMA, {
  id: RECORD_TYPE_IDS.TASK_SESSION, name: '任务工作块', categoryKey: '任务工作块', captureMode: 'internal',
  description: '一次已发生的任务执行事实。', fields: [], targetFile: '',
});

export const RECORD_SCHEMA_DEFINITIONS: readonly RecordSchemaDefinition[] = [
  THOUGHT_DEFINITION, EVIDENCE_DEFINITION, HABIT_DEFINITION, PLAN_DEFINITION, REVIEW_DEFINITION,
  BLOCKER_DEFINITION, MILESTONE_DEFINITION, TASK_DEFINITION, TASK_SERIES_DEFINITION, TASK_SESSION_DEFINITION,
  ENERGY_DEFINITION,
];
