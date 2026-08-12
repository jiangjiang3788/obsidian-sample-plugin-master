import {
  buildViewToolbarDateTargets,
  getViewToolbarUnit,
  shouldRenderViewToolbarFallbackFilters,
  VIEW_TOOLBAR_OPTIONS,
} from '@/features/views/runtime/ViewToolbarModel';
import { dayjs } from '@core/public';

describe('ViewToolbarModel', () => {
  it('keeps canonical view options and date units together', () => {
    expect(VIEW_TOOLBAR_OPTIONS).toEqual(['年', '季', '月', '周', '天']);
    expect(getViewToolbarUnit('年')).toBe('year');
    expect(getViewToolbarUnit('季')).toBe('quarter');
    expect(getViewToolbarUnit('unknown')).toBe('day');
  });

  it('builds date navigation targets', () => {
    const current = dayjs('2026-06-26');
    const targets = buildViewToolbarDateTargets(current, '周', dayjs('2026-01-01'));
    expect(targets.previous.format('YYYY-MM-DD')).toBe('2026-06-19');
    expect(targets.next.format('YYYY-MM-DD')).toBe('2026-07-03');
    expect(targets.today.format('YYYY-MM-DD')).toBe('2026-01-01');
  });

  it('does not render fallback filters when a custom filter slot exists', () => {
    expect(shouldRenderViewToolbarFallbackFilters({ hasFilterSlot: true, canSelectThemes: true, canSelectCategories: true })).toBe(false);
    expect(shouldRenderViewToolbarFallbackFilters({ hasFilterSlot: false, canSelectThemes: false, canSelectCategories: false })).toBe(false);
    expect(shouldRenderViewToolbarFallbackFilters({ hasFilterSlot: false, canSelectThemes: true, canSelectCategories: false })).toBe(true);
  });
});
