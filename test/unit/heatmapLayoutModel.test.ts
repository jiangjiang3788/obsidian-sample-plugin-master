import {
  applyHeatmapVerticalLayout,
  resolveHeatmapVerticalLayout,
  shouldSkipHeatmapVerticalLayout,
  toggleHeatmapCollapsedTheme,
} from '@/features/settings/views/runtime/HeatmapLayoutModel';

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
