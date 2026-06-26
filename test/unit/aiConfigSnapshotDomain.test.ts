import { buildAiConfigSnapshot } from '@/core/ai/AiConfigSnapshot';
import { DEFAULT_AI_SETTINGS, DEFAULT_CORE_BLOCKS } from '@/core/public';
import type { GoalSettings, InputSettings } from '@/core/public';

describe('AI config snapshot domain model', () => {
  const input: InputSettings = {
    blocks: DEFAULT_CORE_BLOCKS as any,
    themes: [{ id: 'theme-sleep', path: '健康/睡眠', icon: '💤' } as any],
  };

  const goalSettings: GoalSettings = {
    goals: [{
      id: 'goal.self',
      title: '#照顾好自己',
      goalPath: '#照顾好自己',
      status: 'active',
      themePath: '健康/睡眠',
      metrics: [],
      createdAt: '2026-06-23T00:00:00.000Z',
      updatedAt: '2026-06-23T00:00:00.000Z',
    }],
    cycles: [],
    goalRecordRelations: [],
    goalBlockBindings: [{
      id: 'goal-template.goal.self.core.habit.sleep',
      goalId: 'goal.self',
      coreBlockId: 'core.habit',
      variantId: 'sleep',
      name: '睡眠打卡',
      isDefault: true,
      enabled: true,
      defaultValues: { themePath: '健康/睡眠', goalId: 'goal.self' },
      createdAt: '2026-06-23T00:00:00.000Z',
      updatedAt: '2026-06-23T00:00:00.000Z',
    }],
  };

  it('ignores stale blk_* enabledBlockIds so AI snapshot does not become empty', () => {
    const snapshot = buildAiConfigSnapshot(input, { ...DEFAULT_AI_SETTINGS, enabledBlockIds: ['blk_old_1'] }, goalSettings);
    expect(snapshot.blocks.length).toBeGreaterThan(0);
    expect(snapshot.goalPresets.length).toBeGreaterThan(0);
  });

  it('hides system context fields from block and preset fields', () => {
    const snapshot = buildAiConfigSnapshot(input, { ...DEFAULT_AI_SETTINGS, enabledBlockIds: [] }, goalSettings);
    const allFieldKeys = [...snapshot.blocks.flatMap((block) => block.fields.map((field) => field.key)), ...snapshot.goalPresets.flatMap((preset) => preset.fields.map((field) => field.key))];
    expect(allFieldKeys).not.toContain('目标');
    expect(allFieldKeys).not.toContain('themePath');
    expect(snapshot.goalPresets[0]).toMatchObject({
      goalTemplateId: 'goal-template.goal.self.core.habit.sleep',
      goalPath: '#照顾好自己',
      blockId: 'core.habit',
      themePath: '健康/睡眠',
    });
  });
});
