import {
  buildProgressBlockCountRows,
  buildProgressCollapsedFacts,
  buildProgressSkillRows,
  getProgressLevelMeta,
  buildProgressSummary,
  getGoalProgressRemainingPoints,
  getGoalProgressTitle,
  getProgressLeafLabel,
  getVisibleProgressThemeBreakdown,
  progressBarWidth,
  ratioPercent,
  type GoalProgressCardModel,
} from '@/features/settings/views/runtime/ProgressViewModel';

const card = {
  key: 'g1',
  title: '',
  goalPath: '工作/代码',
  itemCount: 3,
  totalPoints: 120,
  level: 2,
  currentLevelPoints: 30,
  nextLevelPoints: 100,
  levelStep: 100,
  progressRatio: 1.4,
  matchedCount: 3,
  latestDate: '2026-06-01',
  blockCounts: { task: 2, habit: 0, milestone: 1, energy: 4 },
  themeBreakdown: [
    { key: '工作/代码', points: 80, count: 2 },
    { key: '工作/会议', points: 0, count: 0 },
  ],
};

describe('ProgressViewModel', () => {
  it('normalizes percent display and progress width', () => {
    expect(ratioPercent(1.4)).toBe('100%');
    expect(ratioPercent(-1)).toBe('0%');
    expect(progressBarWidth(0.456)).toBe('46%');
  });

  it('derives labels, remaining points, collapsed facts and visible breakdowns', () => {
    expect(getGoalProgressTitle(card as any)).toBe('工作/代码');
    expect(getProgressLeafLabel('工作/代码')).toBe('代码');
    expect(getGoalProgressRemainingPoints(card as any)).toBe(70);
    expect(buildProgressCollapsedFacts(card as any).map((fact) => `${fact.label}:${fact.value}`)).toEqual([
      '任务:2',
      '打卡:0',
      '阻碍项:0',
      '里程碑:1',
      '最近:2026-06-01',
    ]);
    expect(getVisibleProgressThemeBreakdown(card.themeBreakdown).map((row) => row.key)).toEqual(['工作/代码']);
  });



  it('builds skill rows and caps level metadata at level 10', () => {
    const rows = buildProgressSkillRows({ ...card, levelStep: 20 } as unknown as GoalProgressCardModel);
    expect(rows[0]).toMatchObject({ title: '代码', count: 2, points: 80 });
    expect(rows[0]?.levelMeta.level).toBe(5);
    expect(getProgressLevelMeta(99)).toMatchObject({ level: 10, title: '大师' });
  });

  it('builds block rows and fallback summary', () => {
    expect(buildProgressBlockCountRows(card.blockCounts).map((row) => [row.key, row.count])).toEqual([
      ['task', 2],
      ['milestone', 1],
      ['energy', 4],
    ]);
    expect(buildProgressSummary([card as any])).toEqual({ goalCount: 1, totalPoints: 120, totalItems: 3 });
    expect(buildProgressSummary([card as any], { goalCount: 9, totalPoints: 8, totalItems: 7 })).toEqual({ goalCount: 9, totalPoints: 8, totalItems: 7 });
  });
});
