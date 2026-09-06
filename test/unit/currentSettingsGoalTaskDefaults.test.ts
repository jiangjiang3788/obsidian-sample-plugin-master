/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F035/unit
 * @covers F037/unit
 * 当前 data.json 的 Goal → Task 默认值契约。
 */
import fs from 'node:fs';
import path from 'node:path';

type GoalRow = { path?: string };
type TemplateRow = {
  goalPath?: string;
  recordTypeId?: string;
  enabled?: boolean;
  defaultValues?: Record<string, unknown>;
};
type SettingsFile = {
  goalSettings?: { goals?: GoalRow[]; goalTemplates?: TemplateRow[] };
};

describe('current data Goal Task defaults', () => {
  const data = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'data.json'), 'utf8')) as SettingsFile;
  const goals = data.goalSettings?.goals || [];
  const templates = data.goalSettings?.goalTemplates || [];
  const taskTemplates = templates.filter((template) => template.recordTypeId === 'core.task' && template.enabled !== false);
  const requiredDefaultKeys = [
    'brainDemand', 'physicalDemand', 'importance', 'urgency', 'priority', 'availabilityContexts', 'recurrenceUnit',
  ];

  it('开车已合并进车车，且不会保留开车 Goal / TaskTemplate', () => {
    expect(goals.some((goal) => goal.path === '我若安好便是晴天/开车')).toBe(false);
    expect(goals.some((goal) => goal.path === '我若安好便是晴天/车车')).toBe(true);
    expect(taskTemplates.some((template) => template.goalPath === '我若安好便是晴天/开车')).toBe(false);
  });

  it('每个现有可创建 Task 的 GoalTemplate 都有完整的新任务默认字段', () => {
    expect(taskTemplates.length).toBeGreaterThan(0);
    for (const template of taskTemplates) {
      const defaults = template.defaultValues || {};
      for (const key of requiredDefaultKeys) expect(defaults).toHaveProperty(key);
      expect(defaults).not.toHaveProperty('energyDemand');
      expect(Array.isArray(defaults.availabilityContexts)).toBe(true);
      const contexts = Array.isArray(defaults.availabilityContexts) ? defaults.availabilityContexts.map(String) : [];
      expect(contexts.every((value) => ['any', 'work', 'home', 'commute', 'out'].includes(value))).toBe(true);
    }
  });

  it('关键 Goal 的默认值与最终整理结果一致', () => {
    const byGoal = new Map<string, Record<string, unknown>>(
      taskTemplates.map((template) => [template.goalPath || '', template.defaultValues || {}]),
    );
    expect(byGoal.get('武装大脑')).toEqual(expect.objectContaining({
      brainDemand: 'high', physicalDemand: 'medium', importance: 'important', urgency: 'normal',
      priority: 'highest', availabilityContexts: ['any'], recurrenceUnit: 'month',
    }));
    expect(byGoal.get('工作能力/通勤')).toEqual(expect.objectContaining({ availabilityContexts: ['commute'] }));
    expect(byGoal.get('仪容仪表/剪头发')).toEqual(expect.objectContaining({ availabilityContexts: ['out'] }));
  });
});
