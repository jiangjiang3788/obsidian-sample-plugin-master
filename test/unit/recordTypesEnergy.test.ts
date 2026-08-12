import { DEFAULT_CORE_BLOCKS } from '@core/blocks/public';
import { DEFAULT_RECORD_TYPES, ENERGY_RECORD_TYPE } from '@core/recordTypes/public';
import {
  ENERGY_QUICK_LEVELS,
  buildEnergySnapshotMarkdown,
  buildEnergySnapshotRecord,
  calculateDetailedEnergyScore,
  normalizeEnergyScore,
  toEnergyQuickLevel,
  parseEnergyProtocolParams,
  resolveEnergyCaptureGoal,
} from '@core/energy/public';

describe('Energy direct record foundation', () => {
  it('keeps energy outside the GoalTemplate/CoreBlock matrix', () => {
    expect(DEFAULT_CORE_BLOCKS.some((block) => block.id === 'core.energy')).toBe(false);
    expect(ENERGY_RECORD_TYPE.captureMode).toBe('direct');
    expect(ENERGY_RECORD_TYPE.goalBindable).toBe(true);
    expect(ENERGY_RECORD_TYPE.targetFile).toBe('01/目标精力.md');
    expect(DEFAULT_RECORD_TYPES.some((recordType) => recordType.id === 'core.energy')).toBe(true);
  });

  it('uses five quick capture points while keeping detailed values on a 0-100 scale', () => {
    expect(ENERGY_QUICK_LEVELS).toEqual([20, 40, 60, 80, 100]);
    expect(normalizeEnergyScore(-8)).toBe(0);
    expect(normalizeEnergyScore(73.4)).toBe(73);
    expect(normalizeEnergyScore(108)).toBe(100);
    expect(toEnergyQuickLevel(73)).toBe(80);
    expect(toEnergyQuickLevel(49)).toBe(40);
    expect(toEnergyQuickLevel(0)).toBe(20);
  });

  it('builds Goal-bound but non-Template-bound quick energy markdown', () => {
    const record = buildEnergySnapshotRecord({
      goalId: 'goal.我若安好便是晴天',
      goalPath: '#我若安好便是晴天',
      themePath: '生活',
      date: '2026-08-10',
      time: '15:42',
      score: 80,
      scoreMode: 'quick',
      source: 'desktop-panel',
    });
    expect(record.score).toBe(80);
    expect(record.quickLevel).toBe(80);

    const markdown = buildEnergySnapshotMarkdown(record);
    expect(markdown).toMatch(/记录ID:: energy\.[0-9A-HJKMNP-TV-Z]{26}/);
    expect(markdown).toContain('记录版本:: 2');
    expect(markdown).toContain('核心Block:: energy');
    expect(markdown).toContain('目标ID:: goal.我若安好便是晴天');
    expect(markdown).toContain('精力值:: 80');
    expect(markdown).not.toContain('精力档位::');
    expect(markdown).not.toContain('分类:: 精力');
    expect(markdown).toContain('评分模式:: quick');
    expect(markdown).toContain('来源:: desktop-panel');
    expect(markdown).not.toContain('模板ID::');
    expect(markdown).not.toContain('模板来源::');
  });

  it('keeps brain and physical energy as raw detailed values and derives the total by mean-v1', () => {
    expect(calculateDetailedEnergyScore(73, 41)).toBe(57);

    const record = buildEnergySnapshotRecord({
      goalId: 'goal.我若安好便是晴天',
      goalPath: '#我若安好便是晴天',
      themePath: '生活',
      date: '2026-08-10',
      time: '16:20',
      scoreMode: 'detailed',
      brainScore: 73,
      physicalScore: 41,
      source: 'desktop-panel',
    });

    expect(record.brainScore).toBe(73);
    expect(record.physicalScore).toBe(41);
    expect(record.score).toBe(57);
    expect(record.quickLevel).toBe(60);
    expect(record.aggregateMethod).toBe('arithmetic-mean-v1');

    const markdown = buildEnergySnapshotMarkdown(record);
    expect(markdown).toContain('精力值:: 57');
    expect(markdown).toContain('脑力精力:: 73');
    expect(markdown).toContain('体力精力:: 41');
    expect(markdown).toContain('综合算法:: arithmetic-mean-v1');
    expect(markdown).toContain('评分模式:: detailed');
  });

  it('parses only safe v1 iOS quick/detailed protocol payloads', () => {
    expect(parseEnergyProtocolParams({ v: '1', mode: 'quick', energy: '80' })).toEqual({
      ok: true,
      payload: { version: 1, mode: 'quick', score: 80 },
    });
    expect(parseEnergyProtocolParams({ v: '1', mode: 'detailed', mental: '73', physical: '41' })).toEqual({
      ok: true,
      payload: { version: 1, mode: 'detailed', brainScore: 73, physicalScore: 41 },
    });
    expect(parseEnergyProtocolParams({ v: '1', mode: 'quick', energy: '70' }).ok).toBe(false);
    expect(parseEnergyProtocolParams({ v: '2', mode: 'quick', energy: '80' }).ok).toBe(false);
    expect(parseEnergyProtocolParams({ v: '1', mode: 'detailed', mental: '101', physical: '41' }).ok).toBe(false);
  });

  it('resolves the configured default goal and safely falls back to an active goal', () => {
    const goals = [
      { id: 'goal.a', title: 'A', goalPath: 'A', status: 'paused', parentGoalId: null, themePath: '生活', createdAt: '', updatedAt: '' },
      { id: 'goal.b', title: 'B', goalPath: 'B', status: 'active', parentGoalId: null, themePath: '工作', createdAt: '', updatedAt: '' },
      { id: 'goal.c', title: 'C', goalPath: 'C', status: 'archived', parentGoalId: null, themePath: null, createdAt: '', updatedAt: '' },
    ];
    expect(resolveEnergyCaptureGoal(goals as any, 'goal.a')?.id).toBe('goal.a');
    expect(resolveEnergyCaptureGoal(goals as any, 'missing')?.id).toBe('goal.b');
    expect(resolveEnergyCaptureGoal(goals as any, 'goal.c')?.id).toBe('goal.b');
  });

});
