import {
  applyHeatmapVerticalLayout,
  resolveHeatmapVerticalLayout,
  shouldSkipHeatmapVerticalLayout,
  toggleHeatmapCollapsedTheme,
} from '@/features/views/runtime/HeatmapLayoutModel';
import {
  buildDayThemeGroups,
  filterGoalHeatmapGroups,
  inferHeatmapBlockIdByTheme,
  normalizeHeatmapBlockId,
  resolveHeatmapCreateBlockId,
} from '@/features/views/runtime/HeatmapViewModel';

describe('HeatmapLayoutModel', () => {
  it('skips default/grid/week layouts and applies day/month thresholds', () => {
    expect(shouldSkipHeatmapVerticalLayout('__default__', '月')).toBe(true);
    expect(shouldSkipHeatmapVerticalLayout('健康/睡眠', '年')).toBe(true);
    expect(shouldSkipHeatmapVerticalLayout('健康/睡眠', '周')).toBe(true);
    expect(resolveHeatmapVerticalLayout({ theme: '健康/睡眠', normalizedCurrentView: '天', isDayView: true, containerWidth: 319 })).toBe(true);
    expect(resolveHeatmapVerticalLayout({ theme: '健康/睡眠', normalizedCurrentView: '天', isDayView: true, containerWidth: 320 })).toBe(false);
    expect(resolveHeatmapVerticalLayout({ theme: '健康/睡眠', normalizedCurrentView: '月', isDayView: false, containerWidth: 599 })).toBe(true);
  });

  it('updates vertical and collapsed sets immutably', () => {
    const vertical = applyHeatmapVerticalLayout(new Set(['a']), 'b', true);
    expect(Array.from(vertical).sort()).toEqual(['a', 'b']);
    expect(Array.from(applyHeatmapVerticalLayout(vertical, 'a', false))).toEqual(['b']);

    const collapsed = toggleHeatmapCollapsedTheme(new Set(['x']), 'x');
    expect(collapsed.has('x')).toBe(false);
    expect(toggleHeatmapCollapsedTheme(collapsed, 'y').has('y')).toBe(true);
  });
});

const inputSettings = {
  blocks: [
    { id: 'habit-block', coreBlockId: 'core.habit', categoryKey: '打卡', name: '打卡' },
    { id: 'task-block', coreBlockId: 'core.task', categoryKey: '任务', name: '任务' },
  ],
  themes: [],
} as any;

describe('HeatmapViewModel', () => {
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
