import type { CoreBlockDefinition, CoreBlockKey, CoreBlockSettings } from './types';

export const CORE_BLOCK_IDS: Record<Uppercase<CoreBlockKey>, string> = {
  TASK: 'core.task',
  PLAN: 'core.plan',
  REVIEW: 'core.review',
  THOUGHT: 'core.thought',
  HABIT: 'core.habit',
  EVIDENCE: 'core.evidence',
  BLOCKER: 'core.blocker',
  MILESTONE: 'core.milestone',
};

const themeField = {
  id: 'core.field.themePath',
  key: 'themePath',
  label: '主题',
  type: 'hierarchicalSingleSelect' as const,
  semantic: 'themePath' as const,
  semanticType: 'path',
  hierarchical: true,
  defaultValue: '{{goal.themePath}}',
};

const dateField = { id: 'core.field.date', key: '日期', label: '日期', type: 'date' as const, semantic: 'date' as const };
const iconField = { id: 'core.field.icon', key: 'icon', label: '图标', type: 'text' as const, semantic: 'icon' as const };
const contentField = { id: 'core.field.content', key: '内容', label: '内容', type: 'textarea' as const, semantic: 'body' as const };

function block(overrides: Omit<CoreBlockDefinition, 'system' | 'version'>): CoreBlockDefinition {
  return { ...overrides, system: true, version: 1 };
}

export const DEFAULT_CORE_BLOCKS: CoreBlockDefinition[] = [
  block({
    id: CORE_BLOCK_IDS.TASK,
    key: 'task',
    name: '任务',
    description: '目标下的可执行任务。',
    categoryKey: '任务',
    fields: [
      { id: 'core.task.content', key: '任务内容', label: '任务内容', type: 'textarea', semantic: 'body' },
      themeField,
      { id: 'core.task.scheduledDate', key: 'scheduledDate', label: '计划日期', type: 'date' },
      { id: 'core.task.startDate', key: 'startDate', label: '开始日期', type: 'date' },
      { id: 'core.task.dueDate', key: 'dueDate', label: '截止日期', type: 'date' },
      { id: 'core.task.expectedDuration', key: 'expectedDurationMinutes', label: '预计时长', type: 'number', min: 1 },
      { id: 'core.task.priority', key: 'priority', label: '优先级', type: 'singleSelect', options: [
        { value: 'lowest', label: '最低' }, { value: 'low', label: '低' }, { value: 'medium', label: '中' }, { value: 'high', label: '高' }, { value: 'highest', label: '最高' },
      ] },
      { id: 'core.task.energyDemand', key: 'energyDemand', label: '精力要求', type: 'singleSelect', options: [
        { value: 'low', label: '低' }, { value: 'medium', label: '中' }, { value: 'high', label: '高' },
      ] },
      { id: 'core.task.brainDemand', key: 'brainDemand', label: '脑力要求', type: 'singleSelect', options: [
        { value: 'low', label: '低' }, { value: 'medium', label: '中' }, { value: 'high', label: '高' },
      ] },
      { id: 'core.task.physicalDemand', key: 'physicalDemand', label: '体力要求', type: 'singleSelect', options: [
        { value: 'low', label: '低' }, { value: 'medium', label: '中' }, { value: 'high', label: '高' },
      ] },
      { id: 'core.task.recurrenceUnit', key: 'recurrenceUnit', label: '重复单位', type: 'singleSelect', options: [
        { value: 'day', label: '天' }, { value: 'week', label: '周' }, { value: 'month', label: '月' }, { value: 'quarter', label: '季' }, { value: 'year', label: '年' },
      ] },
      { id: 'core.task.recurrenceInterval', key: 'recurrenceInterval', label: '重复间隔', type: 'number', min: 1, defaultValue: '1' },
      { id: 'core.task.recurrenceAnchor', key: 'recurrenceAnchor', label: '重复锚点', type: 'singleSelect', defaultValue: 'scheduled', options: [
        { value: 'scheduled', label: '计划日期' }, { value: 'start', label: '开始日期' }, { value: 'due', label: '截止日期' }, { value: 'completion', label: '完成日期' },
      ] },
    ],
    outputTemplate: '<!-- start -->\n记录ID:: {{recordId}}\n记录版本:: 2\n核心Block:: task\n状态:: open\n内容:: {{任务内容}}\n目标ID:: {{goalId}}\n目标:: {{goalPath}}\n主题:: {{themePath}}\n计划日期:: {{scheduledDate}}\n开始日期:: {{startDate}}\n截止日期:: {{dueDate}}\n预计时长:: {{expectedDurationMinutes}}\n优先级:: {{priority.value}}\n精力要求:: {{energyDemand.value}}\n脑力要求:: {{brainDemand.value}}\n体力要求:: {{physicalDemand.value}}\n模板ID:: {{templateId}}\n模板来源:: {{templateSourceType}}\n<!-- end -->',
    targetFile: '01/目标.md',
    appendUnderHeader: '## {{goalPath}}',
  }),
  block({ id: CORE_BLOCK_IDS.PLAN, key: 'plan', name: '计划', description: '目标周期计划。', categoryKey: '计划', periodPolicy: { enabled: true, granularity: 'week' }, fields: [contentField, themeField, dateField, iconField], outputTemplate: '<!-- start -->\n模板ID:: {{templateId}}\n模板来源:: {{templateSourceType}}\n核心Block:: plan\n目标ID:: {{goalId}}\n目标:: {{goalPath}}\n分类:: 计划\n周期粒度:: {{period.granularity}}\n周期ID:: {{period.id}}\n周期:: {{period.label}}\n日期:: {{日期}}\n主题:: {{themePath}}\n图标:: {{theme.icon}}\n内容:: {{内容}}\n<!-- end -->', targetFile: '01/目标计划.md', appendUnderHeader: '## {{goalPath}}' }),
  block({ id: CORE_BLOCK_IDS.REVIEW, key: 'review', name: '总结', description: '目标复盘总结。', categoryKey: '总结', periodPolicy: { enabled: true, granularity: 'week' }, fields: [contentField, themeField, dateField, iconField], outputTemplate: '<!-- start -->\n模板ID:: {{templateId}}\n模板来源:: {{templateSourceType}}\n核心Block:: review\n目标ID:: {{goalId}}\n目标:: {{goalPath}}\n分类:: 总结\n周期粒度:: {{period.granularity}}\n周期ID:: {{period.id}}\n周期:: {{period.label}}\n日期:: {{日期}}\n主题:: {{themePath}}\n图标:: {{theme.icon}}\n内容:: {{内容}}\n<!-- end -->', targetFile: '01/目标总结.md', appendUnderHeader: '## {{goalPath}}' }),
  block({ id: CORE_BLOCK_IDS.THOUGHT, key: 'thought', name: '思考', description: '目标相关思考。', categoryKey: '思考', fields: [contentField, themeField, dateField, iconField], outputTemplate: '<!-- start -->\n模板ID:: {{templateId}}\n模板来源:: {{templateSourceType}}\n核心Block:: thought\n目标ID:: {{goalId}}\n目标:: {{goalPath}}\n分类:: 思考\n日期:: {{日期}}\n主题:: {{themePath}}\n图标:: {{theme.icon}}\n内容:: {{内容}}\n<!-- end -->', targetFile: '01/目标思考.md', appendUnderHeader: '## {{goalPath}}' }),
  block({ id: CORE_BLOCK_IDS.HABIT, key: 'habit', name: '打卡', description: '目标习惯或进度打卡。', categoryKey: '打卡', fields: [contentField, themeField, dateField, { id: 'core.habit.rating', key: '评分', label: '评分', type: 'rating', semantic: 'rating' }, iconField], outputTemplate: '<!-- start -->\n模板ID:: {{templateId}}\n模板来源:: {{templateSourceType}}\n核心Block:: habit\n目标ID:: {{goalId}}\n目标:: {{goalPath}}\n分类:: 打卡\n日期:: {{日期}}\n主题:: {{themePath}}\n评分:: {{评分.label}}\n评图:: {{评分.value}}\n图标:: {{theme.icon}}\n内容:: {{内容}}\n<!-- end -->', targetFile: '01/目标打卡.md', appendUnderHeader: '## {{goalPath}}' }),
  block({ id: CORE_BLOCK_IDS.EVIDENCE, key: 'evidence', name: '事件', description: '目标相关事件、证据和外部反馈。', categoryKey: '事件', fields: [contentField, themeField, dateField, iconField], outputTemplate: '<!-- start -->\n模板ID:: {{templateId}}\n模板来源:: {{templateSourceType}}\n核心Block:: evidence\n目标ID:: {{goalId}}\n目标:: {{goalPath}}\n分类:: 事件\n日期:: {{日期}}\n主题:: {{themePath}}\n图标:: {{theme.icon}}\n内容:: {{内容}}\n<!-- end -->', targetFile: '01/目标事件.md', appendUnderHeader: '## {{goalPath}}' }),
  block({ id: CORE_BLOCK_IDS.BLOCKER, key: 'blocker', name: '阻碍项', description: '目标推进过程中的阻碍和风险。', categoryKey: '阻碍项', fields: [contentField, themeField, dateField, iconField], outputTemplate: '<!-- start -->\n模板ID:: {{templateId}}\n模板来源:: {{templateSourceType}}\n核心Block:: blocker\n目标ID:: {{goalId}}\n目标:: {{goalPath}}\n分类:: 阻碍项\n日期:: {{日期}}\n主题:: {{themePath}}\n图标:: {{theme.icon}}\n阻碍:: {{内容}}\n<!-- end -->', targetFile: '01/目标阻碍.md', appendUnderHeader: '## {{goalPath}}' }),
  block({ id: CORE_BLOCK_IDS.MILESTONE, key: 'milestone', name: '里程碑', description: '目标阶段成果和重要节点。', categoryKey: '里程碑', fields: [contentField, themeField, dateField, iconField], outputTemplate: '<!-- start -->\n模板ID:: {{templateId}}\n模板来源:: {{templateSourceType}}\n核心Block:: milestone\n目标ID:: {{goalId}}\n目标:: {{goalPath}}\n分类:: 里程碑\n日期:: {{日期}}\n主题:: {{themePath}}\n图标:: {{theme.icon}}\n里程碑:: {{内容}}\n<!-- end -->', targetFile: '01/目标里程碑.md', appendUnderHeader: '## {{goalPath}}' }),
];

export const DEFAULT_CORE_BLOCK_SETTINGS: CoreBlockSettings = {
  enabledCoreBlockIds: DEFAULT_CORE_BLOCKS.map((block) => block.id),
  patches: [],
};
