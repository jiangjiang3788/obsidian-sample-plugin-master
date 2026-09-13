/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F037/persistence
 * @covers F037/unit
 */
import {
  compactGoalTemplateForStorage,
  DEFAULT_TEMPLATE_RECORD_TYPES,
  DEFAULT_GOAL_SETTINGS,
  describeGoalTemplateStorageDiff,
  getGoalTemplateId,
  getGoalTemplates,
  removeGoalTemplateFromSettings,
  upsertGoalTemplateInSettings,
} from '@/core/public';
import type { GoalDefinition, GoalTemplate } from '@/core/public';

const taskBlock = DEFAULT_TEMPLATE_RECORD_TYPES.find((block) => block.id === 'core.task')!;
const planBlock = DEFAULT_TEMPLATE_RECORD_TYPES.find((block) => block.id === 'core.plan')!;
const goal: GoalDefinition = {
  path: '爱好能力/电脑/记录系统',
  status: 'active',
  metrics: [],
  createdAt: '2026-06-23T00:00:00.000Z',
  updatedAt: '2026-06-23T00:00:00.000Z',
};

describe('GoalTemplate storage helpers', () => {
  it('upserts and removes one template by Goal path × RecordType', () => {
    const template: GoalTemplate = {
      id: getGoalTemplateId('照顾好自己/健康/睡眠', 'core.task'),
      goalPath: '照顾好自己/健康/睡眠',
      recordTypeId: 'core.task',
      enabled: true,
    };
    const next = upsertGoalTemplateInSettings(DEFAULT_GOAL_SETTINGS, template);
    expect(getGoalTemplates(next)).toHaveLength(1);
    expect(getGoalTemplates(next)[0]?.goalPath).toBe('照顾好自己/健康/睡眠');
    const removed = removeGoalTemplateFromSettings(next, '照顾好自己/健康/睡眠', 'core.task');
    expect(getGoalTemplates(removed)).toHaveLength(0);
  });

  it('stores only overrides that differ from the RecordType', () => {
    const template: GoalTemplate = {
      id: getGoalTemplateId(goal.path, 'core.task'),
      goalPath: goal.path,
      recordTypeId: 'core.task',
      enabled: true,
      fields: taskBlock.fields as any,
      targetFile: taskBlock.targetFile,
      appendUnderHeader: taskBlock.appendUnderHeader,
      defaultValues: { goalPath: goal.path, icon: '🧩' },
      requiredFields: [],
    };
    const compacted = compactGoalTemplateForStorage(template, { recordType: taskBlock });
    expect(compacted.fields).toBeUndefined();
    expect(compacted.targetFile).toBeUndefined();
    expect(compacted.appendUnderHeader).toBeUndefined();
    expect(compacted.requiredFields).toBeUndefined();
    expect(compacted.defaultValues).toBeUndefined();
    expect(compacted.periodPolicy).toBeUndefined();
  });

  it('drops legacy per-template icon defaults because Goal.icon is the only Goal identity icon', () => {
    const template: GoalTemplate = {
      id: getGoalTemplateId(goal.path, 'core.plan'),
      goalPath: goal.path,
      recordTypeId: 'core.plan',
      enabled: true,
      defaultValues: { icon: '🧩', 内容: '保留我' },
      fields: (planBlock.fields as any[]).map((field) => field.key === 'icon' ? { ...field, defaultValue: '🧩' } : field) as any,
    };
    const compacted = compactGoalTemplateForStorage(template, { recordType: planBlock });
    expect(compacted.defaultValues).toEqual({ 内容: '保留我' });
    expect(compacted.fields?.find((field) => field.key === 'icon')?.defaultValue).toBeUndefined();
  });

  it('keeps periodPolicy only for period-aware blocks', () => {
    const taskTemplate = compactGoalTemplateForStorage({
      id: getGoalTemplateId(goal.path, 'core.task'), goalPath: goal.path, recordTypeId: 'core.task', enabled: true,
      periodPolicy: { enabled: true, granularity: 'month' },
    }, { recordType: taskBlock });
    const planTemplate = compactGoalTemplateForStorage({
      id: getGoalTemplateId(goal.path, 'core.plan'), goalPath: goal.path, recordTypeId: 'core.plan', enabled: true,
      periodPolicy: { enabled: true, granularity: 'quarter' },
    }, { recordType: planBlock });
    expect(taskTemplate.periodPolicy).toBeUndefined();
    expect(planTemplate.periodPolicy).toEqual({ enabled: true, granularity: 'quarter' });
    expect(describeGoalTemplateStorageDiff(planTemplate)).toContain('周期 quarter');
  });
});
