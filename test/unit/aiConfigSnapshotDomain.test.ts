/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F071/unit
 * @covers F112/unit
 */
import { buildAiConfigSnapshot } from '@/core/ai/AiConfigSnapshot';
import { DEFAULT_AI_SETTINGS, DEFAULT_TEMPLATE_RECORD_TYPES, getGoalTemplateId } from '@/core/public';
import type { GoalSettings, InputSettings } from '@/core/public';

describe('AI config snapshot domain model', () => {
  const input: InputSettings = { blocks: DEFAULT_TEMPLATE_RECORD_TYPES as any };
  const goalPath = '照顾好自己/健康/睡眠';
  const goalSettings: GoalSettings = {
    goals: [{ path: goalPath, status: 'active', metrics: [], createdAt: '', updatedAt: '' }],
    goalTemplates: [{ goalPath, recordTypeId: 'core.habit', enabled: true }],
  };

  it('ignores stale enabledBlockIds so AI snapshot does not become empty', () => {
    const snapshot = buildAiConfigSnapshot(input, { ...DEFAULT_AI_SETTINGS, enabledBlockIds: ['blk_old_1'] }, goalSettings);
    expect(snapshot.blocks.length).toBeGreaterThan(0);
    expect(snapshot.goalPresets).toHaveLength(1);
  });

  it('hides Goal context fields from editable block and preset fields', () => {
    const snapshot = buildAiConfigSnapshot(input, { ...DEFAULT_AI_SETTINGS, enabledBlockIds: [] }, goalSettings);
    const allFieldKeys = [...snapshot.blocks.flatMap((block) => block.fields.map((field) => field.key)), ...snapshot.goalPresets.flatMap((preset) => preset.fields.map((field) => field.key))];
    expect(allFieldKeys).not.toContain('目标');
    expect(allFieldKeys).not.toContain('goalPath');
    expect(snapshot.goalPresets[0]).toMatchObject({
      id: getGoalTemplateId(goalPath, 'core.habit'),
      goalPath,
      blockId: 'core.habit',
    });
  });
});
