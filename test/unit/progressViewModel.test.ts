import { buildProgressViewRenderModel } from '@/features/views/runtime/ProgressViewModel';
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
} from '@/features/views/runtime/ProgressViewModel';

const items: any[] = [
  { id: '1', title: 'A', categoryKey: '任务', coreBlock: 'task', goalPaths: ['项目/目标A'], goalPath: '项目/目标A', extra: {}, tags: [], content: '', created: 0, modified: 0 },
  { id: '2', title: 'B', categoryKey: '打卡', coreBlock: 'habit', goalPaths: ['项目/目标A'], goalPath: '项目/目标A', extra: {}, tags: [], content: '', created: 0, modified: 0 },
  { id: '3', title: 'C', categoryKey: '事件', coreBlock: 'evidence', goalPaths: ['项目/目标B'], goalPath: '项目/目标B', extra: {}, tags: [], content: '', created: 0, modified: 0 },
  { id: '4', title: '', categoryKey: '精力', coreBlock: 'energy', goalPaths: ['项目/目标A'], goalPath: '项目/目标A', date: '2026-08-10', extra: { '时间': '14:35', '精力值': 80, '精力档位': 80, '评分模式': 'quick' }, tags: [], content: '', created: 0, modified: 0 },
];

describe('ProgressView goal mode', () => {
  it('builds collapsible goal progress cards by default', () => {
    const model = buildProgressViewRenderModel({ items: items as any, module: { viewConfig: {} }, goals: [] });
    expect(model.mode).toBe('goal');
    expect(model.goalCards).toHaveLength(2);
    expect(model.goalCards[0]?.goalPath).toBe('项目/目标A');
    expect(model.goalCards[0]?.blockCounts.task).toBe(1);
    expect(model.goalCards[0]?.blockCounts.habit).toBe(1);
    expect(model.goalCards[0]?.blockCounts.energy).toBe(1);
    expect(model.goalCards[0]?.energySummary).toMatchObject({ count: 1, latestScore: 80, latestDate: '2026-08-10', latestTime: '14:35' });
    expect(model.goalCards[0]?.energySummary?.timeline?.coverage).toMatchObject({ sampledDays: 1, missingDays: 6, totalSamples: 1 });
    expect(model.goalCards[0]?.itemCount).toBe(2);
    expect(model.goalCards[0]?.totalPoints).toBe(2);
    expect(model.summary.goalCount).toBe(2);
    expect(model.summary.totalItems).toBe(3);
  });

  it('honors topN without introducing internal filters', () => {
    const model = buildProgressViewRenderModel({ items: items as any, module: { viewConfig: { topN: 1 } }, goals: [] });
    expect(model.goalCards).toHaveLength(1);
  });

  it('attaches reliable nearby activity and same-day health signals to recent Energy samples', () => {
    const contextItems: any[] = [
      { id: 'task', title: '写代码', categoryKey: '任务', coreBlock: 'task', goalPaths: ['项目/目标A'], goalPath: '项目/目标A', date: '2026-08-10', startTime: '14:00', endTime: '15:30', duration: 90, extra: {}, tags: [], content: '', created: 0, modified: 0 },
      { id: 'sleep', title: '睡眠', categoryKey: '打卡', coreBlock: 'habit', goalPaths: ['项目/目标A'], goalPath: '项目/目标A', date: '2026-08-10', rating: 40, extra: {}, tags: [], content: '', created: 0, modified: 0 },
      { id: 'body', title: '身体状态', categoryKey: '打卡', coreBlock: 'habit', goalPaths: ['项目/目标A'], goalPath: '项目/目标A', date: '2026-08-10', rating: 60, extra: {}, tags: [], content: '', created: 0, modified: 0 },
      { id: 'energy', title: '', categoryKey: '精力', coreBlock: 'energy', goalPaths: ['项目/目标A'], goalPath: '项目/目标A', date: '2026-08-10', extra: { '时间': '15:38', '精力值': 20, '精力档位': 20, '评分模式': 'quick' }, tags: [], content: '', created: 0, modified: 0 },
    ];
    const model = buildProgressViewRenderModel({ items: contextItems, module: { viewConfig: {} }, goals: [] });
    const sample = model.goalCards[0]?.energySummary?.recentSamples[0];
    expect(sample?.context?.activity).toMatchObject({ title: '写代码', relation: 'recent', gapMinutes: 8, durationMinutes: 90 });
    expect(sample?.context?.dailySignals.map((signal) => [signal.kind, signal.value])).toEqual([
      ['sleep', 40],
      ['body', 60],
    ]);
  });

});

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
