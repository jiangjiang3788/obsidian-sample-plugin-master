import { dayjs, formatDateForView } from '@core/utils/public';

export const VIEW_TOOLBAR_OPTIONS = ['年', '季', '月', '周', '天'] as const;
export type ViewToolbarOption = typeof VIEW_TOOLBAR_OPTIONS[number];

export function getViewToolbarUnit(view: string): dayjs.ManipulateType {
  return ({
    年: 'year',
    季: 'quarter',
    月: 'month',
    周: 'week',
    天: 'day',
  }[view] || 'day') as dayjs.ManipulateType;
}

export function buildViewToolbarDateLabel(currentDate: dayjs.Dayjs, currentView: string): string {
  return formatDateForView(currentDate, currentView);
}

export function buildViewToolbarDateTargets(currentDate: dayjs.Dayjs, currentView: string, today: dayjs.Dayjs = dayjs()) {
  const unit = getViewToolbarUnit(currentView);
  return {
    previous: currentDate.clone().subtract(1, unit),
    next: currentDate.clone().add(1, unit),
    today,
  };
}

export function shouldRenderViewToolbarFallbackFilters(args: {
  hasFilterSlot: boolean;
  canSelectThemes: boolean;
  canSelectCategories: boolean;
}): boolean {
  return !args.hasFilterSlot && (args.canSelectThemes || args.canSelectCategories);
}
