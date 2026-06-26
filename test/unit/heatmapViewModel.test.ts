import {
  buildDayThemeGroups,
  filterGoalHeatmapGroups,
  inferHeatmapBlockIdByTheme,
  inferHeatmapThemePaths,
  normalizeHeatmapBlockId,
  resolveHeatmapCreateBlockId,
  selectHeatmapThemesToTrack,
} from '@/shared/ui/views/HeatmapViewModel';

const inputSettings = {
  blocks: [
    { id: 'habit-block', coreBlockId: 'core.habit', categoryKey: '打卡', name: '打卡' },
    { id: 'task-block', coreBlockId: 'core.task', categoryKey: '任务', name: '任务' },
  ],
  themes: [],
} as any;

describe('HeatmapViewModel', () => {
  it('infers and selects theme paths without mixing injected state', () => {
    const items = [
      { themePath: '健康/睡眠' },
      { themePath: '健康/运动' },
      { themePath: '健康/睡眠' },
    ] as any[];

    expect(inferHeatmapThemePaths(items)).toEqual(['健康/睡眠', '健康/运动']);
    expect(selectHeatmapThemesToTrack({ injectedThemesToTrack: ['注入/主题'], configuredThemePaths: ['配置/主题'], inferredThemePaths: ['推断/主题'] })).toEqual(['注入/主题']);
    expect(selectHeatmapThemesToTrack({ configuredThemePaths: ['配置/主题'], inferredThemePaths: ['推断/主题'] })).toEqual(['配置/主题']);
    expect(selectHeatmapThemesToTrack({ inferredThemePaths: ['推断/主题'] })).toEqual(['推断/主题']);
  });

  it('normalizes block ids and keeps core.habit as destructive convergence fallback', () => {
    expect(normalizeHeatmapBlockId({ candidate: 'core.habit', inputSettings })).toBe('habit-block');
    expect(normalizeHeatmapBlockId({ candidate: '任务', inputSettings })).toBe('task-block');
    expect(normalizeHeatmapBlockId({ candidate: 'old-habit', inputSettings, configuredSourceBlockId: 'old-habit' })).toBe('habit-block');
  });

  it('infers dominant block by theme and resolves create block precedence', () => {
    const inferred = inferHeatmapBlockIdByTheme([
      { themePath: '健康/睡眠', templateId: 'habit-block' },
      { themePath: '健康/睡眠', templateId: 'habit-block' },
      { themePath: '健康/睡眠', templateId: 'task-block' },
    ] as any[]);

    expect(inferred.get('健康/睡眠')).toBe('habit-block');
    expect(resolveHeatmapCreateBlockId({
      themePath: '健康/睡眠',
      heatmapSourceBlockId: '',
      inferredBlockIdByTheme: inferred,
      normalizeBlockId: (candidate) => normalizeHeatmapBlockId({ candidate, inputSettings }),
    })).toBe('habit-block');
  });

  it('builds day groups by first-level theme and filters empty goal groups', () => {
    const data = new Map<string, Map<string, any[]>>([
      ['健康/睡眠', new Map([['2026-01-01', [{ id: 'a' }]]])],
      ['健康/运动', new Map()],
      ['工作/代码', new Map()],
    ]);

    expect(buildDayThemeGroups({ themesToTrack: ['健康/睡眠', '健康/运动', '工作/代码'], dataByThemeAndDate: data as any }).map((group) => [group.title, group.entries.length])).toEqual([
      ['健康', 2],
      ['工作', 1],
    ]);
    expect(filterGoalHeatmapGroups([{ goalPath: 'g1', label: '目标', count: 0, entries: [] }, { goalPath: 'g2', label: '目标2', count: 1, entries: [{} as any] }])).toHaveLength(1);
  });
});
