import { resolveQuickInputEnergyDefaultGoal, resolveQuickInputEnergyThemePath } from '@/features/quickinput/editor/QuickInputEditorModel';

const goals: any[] = [
  { id: 'goal.a', value: '生活/A', label: 'A', goal: { id: 'goal.a' } },
  { id: 'goal.b', value: '生活/B', label: 'B', goal: { id: 'goal.b' } },
];

describe('Energy desktop defaults', () => {
  it('prefers configured Energy Goal and otherwise falls back to first visible Goal', () => {
    expect(resolveQuickInputEnergyDefaultGoal(goals, 'goal.b')?.id).toBe('goal.b');
    expect(resolveQuickInputEnergyDefaultGoal(goals, 'missing')?.id).toBe('goal.a');
    expect(resolveQuickInputEnergyDefaultGoal([], 'goal.b')).toBeNull();
  });

  it('uses explicit theme first, then Energy default theme, then Goal theme', () => {
    expect(resolveQuickInputEnergyThemePath({
      formThemePath: '上下文/主题',
      formThemeSource: 'invocation_context',
      defaultThemePath: '生活/精力',
      goalThemePath: '生活/默认',
    })).toBe('上下文/主题');
    expect(resolveQuickInputEnergyThemePath({
      formThemePath: '生活/目标主题',
      formThemeSource: 'goal_context',
      defaultThemePath: '生活/精力',
      goalThemePath: '生活/目标主题',
    })).toBe('生活/精力');
    expect(resolveQuickInputEnergyThemePath({
      formThemePath: '生活/目标主题',
      formThemeSource: 'goal_context',
      defaultThemePath: '',
      goalThemePath: '生活/目标主题',
    })).toBe('生活/目标主题');
  });
});
