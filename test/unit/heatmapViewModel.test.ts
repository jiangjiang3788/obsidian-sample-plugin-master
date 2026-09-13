/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F086/unit
 */
import {
  applyHeatmapVerticalLayout,
  resolveHeatmapVerticalLayout,
  shouldSkipHeatmapVerticalLayout,
  toggleHeatmapCollapsedGoal,
} from '@/features/views/runtime/HeatmapLayoutModel';
import {
  buildDayGoalGroups,
  filterGoalHeatmapGroups,
  inferHeatmapRecordTypeIdByGoal,
  normalizeHeatmapRecordTypeId,
  resolveHeatmapCreateRecordTypeId,
} from '@/features/views/runtime/HeatmapViewModel';

describe('HeatmapLayoutModel', () => {
  it('skips default/grid/week layouts and applies day/month thresholds', () => {
    expect(shouldSkipHeatmapVerticalLayout('__default__', '月')).toBe(true);
    expect(shouldSkipHeatmapVerticalLayout('照顾好自己/睡眠', '年')).toBe(true);
    expect(shouldSkipHeatmapVerticalLayout('照顾好自己/睡眠', '周')).toBe(true);
    expect(resolveHeatmapVerticalLayout({ goalPath: '照顾好自己/睡眠', normalizedCurrentView: '天', isDayView: true, containerWidth: 319 })).toBe(true);
    expect(resolveHeatmapVerticalLayout({ goalPath: '照顾好自己/睡眠', normalizedCurrentView: '天', isDayView: true, containerWidth: 320 })).toBe(false);
  });

  it('updates vertical and collapsed Goal sets immutably', () => {
    const vertical = applyHeatmapVerticalLayout(new Set(['a']), 'b', true);
    expect(Array.from(vertical).sort()).toEqual(['a', 'b']);
    expect(Array.from(applyHeatmapVerticalLayout(vertical, 'a', false))).toEqual(['b']);
    const collapsed = toggleHeatmapCollapsedGoal(new Set(['x']), 'x');
    expect(collapsed.has('x')).toBe(false);
    expect(toggleHeatmapCollapsedGoal(collapsed, 'y').has('y')).toBe(true);
  });
});

const inputSettings = { recordTypes: [
  { id: 'habit-block', recordTypeId: 'core.habit', name: '打卡' },
  { id: 'task-block', recordTypeId: 'core.task', name: '任务' },
] } as any;

describe('HeatmapViewModel', () => {
  it('normalizes Record Type ids and keeps core.habit as convergence fallback', () => {
    expect(normalizeHeatmapRecordTypeId({ candidate: 'core.habit', inputSettings })).toBe('habit-block');
    expect(normalizeHeatmapRecordTypeId({ candidate: '任务', inputSettings })).toBe('task-block');
    expect(normalizeHeatmapRecordTypeId({ candidate: 'old-habit', inputSettings, configuredSourceRecordTypeId: 'old-habit' })).toBe('habit-block');
  });

  it('infers dominant Record Type by Goal and resolves create precedence', () => {
    const inferred = inferHeatmapRecordTypeIdByGoal([
      { goalPath: '照顾好自己/睡眠', recordType: 'habit' },
      { goalPath: '照顾好自己/睡眠', recordType: 'habit' },
      { goalPath: '照顾好自己/睡眠', recordType: 'task' },
    ] as any[]);
    expect(inferred.get('照顾好自己/睡眠')).toBe('core.habit');
    expect(resolveHeatmapCreateRecordTypeId({
      goalPath: '照顾好自己/睡眠', heatmapSourceRecordTypeId: '', inferredRecordTypeIdByGoal: inferred,
      normalizeRecordTypeId: (candidate) => normalizeHeatmapRecordTypeId({ candidate, inputSettings }),
    })).toBe('habit-block');
  });

  it('builds day groups by root Goal and filters empty groups', () => {
    const data = new Map<string, Map<string, any[]>>([
      ['照顾好自己/睡眠', new Map([['2026-01-01', [{ id: 'a' }]]])],
      ['照顾好自己/运动', new Map()],
      ['工作能力/设计', new Map()],
    ]);
    expect(buildDayGoalGroups({ goalPathsToTrack: ['照顾好自己/睡眠', '照顾好自己/运动', '工作能力/设计'], dataByGoalAndDate: data as any }).map((group) => [group.title, group.entries.length])).toEqual([
      ['照顾好自己', 2], ['工作能力', 1],
    ]);
    expect(filterGoalHeatmapGroups([{ goalPath: 'g1', label: '目标', count: 0, entries: [] }, { goalPath: 'g2', label: '目标2', count: 1, entries: [{} as any] }])).toHaveLength(1);
  });
});
