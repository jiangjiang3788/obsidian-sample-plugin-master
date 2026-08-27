/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F036/regression
 * @covers F036/unit
 * @covers F041/regression
 * @covers F041/unit
 */
import { ENERGY_RECORD_TYPE_ID } from '@core/recordTypes/public';
import { buildQuickInputGoalOptions } from '@/features/quickinput/editor/QuickInputEditorModel';
import { shouldRequireDirectGoalTemplateForQuickInput } from '@/features/quickinput/editor/quickInputRecordTypeModel';

const settings: any = {
  goalSettings: {
    goals: [
      { path: '生活/活跃', status: 'active' },
      { path: '生活/暂停', status: 'paused' },
      { path: '生活/归档', status: 'archived' },
    ],
    goalTemplates: [],
  },
};

describe('QuickInput RecordType eligibility matrix', () => {
  it('requires a direct GoalTemplate only for normal create flows, never for direct Energy', () => {
    expect(shouldRequireDirectGoalTemplateForQuickInput('create', false)).toBe(true);
    expect(shouldRequireDirectGoalTemplateForQuickInput('create', true)).toBe(false);
    expect(shouldRequireDirectGoalTemplateForQuickInput('edit', false)).toBe(false);
    expect(shouldRequireDirectGoalTemplateForQuickInput('convert', false)).toBe(false);
    expect(shouldRequireDirectGoalTemplateForQuickInput('duplicate', false)).toBe(false);
  });

  it('keeps Energy Goal choices available without any Energy GoalTemplate', () => {
    const goals = buildQuickInputGoalOptions(
      settings,
      ENERGY_RECORD_TYPE_ID,
      shouldRequireDirectGoalTemplateForQuickInput('create', true),
    );
    expect(goals.map((goal) => goal.value)).toEqual(['生活/活跃', '生活/暂停']);
  });

  it('still blocks template-backed create goals when no direct GoalTemplate exists', () => {
    const goals = buildQuickInputGoalOptions(
      settings,
      'core.task',
      shouldRequireDirectGoalTemplateForQuickInput('create', false),
    );
    expect(goals).toEqual([]);
  });
});
