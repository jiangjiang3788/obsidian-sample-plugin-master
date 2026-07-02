import type { QuickInputConfig } from '@core/services/public';
import { dayjs, type Dayjs } from '@core/utils/public';

import { openCreateModal } from './openCreateModal';
import type { StatisticsCreateParams, StatisticsCreatePayload } from './types';

function mapStatisticsCellTypeToPeriod(
  type?: string,
  fallback: '年' | '季' | '月' | '周' | '天' = '月',
): '年' | '季' | '月' | '周' | '天' {
  switch (type) {
    case 'day': return '天';
    case 'week': return '周';
    case 'month': return '月';
    case 'quarter': return '季';
    case 'year': return '年';
    default: return fallback;
  }
}

function resolveStatisticsAnchorDate(
  cell: StatisticsCreatePayload['cellIdentifier'],
  fallbackDate: Dayjs,
): Dayjs {
  if (!cell) return fallbackDate;
  switch (cell.type) {
    case 'day':
      return cell.date ? dayjs(cell.date) : fallbackDate;
    case 'week':
      if (cell.year && cell.week) return dayjs().year(cell.year).isoWeek(cell.week).startOf('isoWeek');
      return fallbackDate;
    case 'month':
      if (cell.year && cell.month) return dayjs().year(cell.year).month(cell.month - 1).startOf('month');
      return fallbackDate;
    case 'quarter':
      if (cell.year && cell.quarter) return dayjs().year(cell.year).quarter(cell.quarter).startOf('quarter');
      return fallbackDate;
    case 'year':
      if (cell.year) return dayjs().year(cell.year).startOf('year');
      return fallbackDate;
    default:
      return fallbackDate;
  }
}

function buildStatisticsExplicitContext(
  payload: StatisticsCreatePayload | undefined,
  anchorDate: Dayjs,
  periodContext: '年' | '季' | '月' | '周' | '天',
  filters: unknown[] | undefined,
  themeId: string | undefined,
): Record<string, unknown> {
  const cell = payload?.cellIdentifier;
  return {
    __recordUiContext: {
      kind: 'statistics_create',
      timeContext: {
        periodType: periodContext,
        anchorDate: anchorDate.format('YYYY-MM-DD'),
        date: cell?.date,
        year: cell?.year,
        quarter: cell?.quarter,
        month: cell?.month,
        week: cell?.week,
      },
      categoryContext: {
        category: cell?.category,
      },
      themeContext: {
        themeId: themeId ?? null,
      },
      goalContext: payload?.context?.__goalContext || null,
      filterContext: {
        title: payload?.title,
        blocksCount: payload?.blocks?.length ?? 0,
        filters: filters || [],
      },
    },
    ...(payload?.context || {}),
  };
}

function buildStatisticsCreateConfig(params: StatisticsCreateParams): QuickInputConfig | null {
  const cell = params.payload?.cellIdentifier ?? null;
  const categoryName = cell?.category;
  if (!categoryName || categoryName === '全部') {
    return null;
  }

  const anchorDate = resolveStatisticsAnchorDate(cell, params.fallbackDate);
  const periodContext = mapStatisticsCellTypeToPeriod(cell?.type, params.currentView);

  if (params.payload?.preferredBlockId) {
    return {
      blockId: params.payload.preferredBlockId,
      context: buildStatisticsExplicitContext(
        params.payload,
        anchorDate,
        periodContext,
        params.viewInstance.filters,
        undefined,
      ),
    };
  }

  const base = params.actionService.getQuickInputConfigForStatisticsView(
    params.viewInstance,
    anchorDate,
    periodContext,
    categoryName,
  );
  if (!base) return null;

  return {
    blockId: base.blockId,
    themeId: base.themeId,
    context: {
      ...(base.context || {}),
      ...buildStatisticsExplicitContext(
        params.payload,
        anchorDate,
        periodContext,
        params.viewInstance.filters,
        base.themeId,
      ),
    },
  };
}

export function canCreateFromStatisticsCell(payload?: StatisticsCreatePayload): boolean {
  const category = payload?.cellIdentifier?.category;
  return !!category && category !== '全部';
}

export function openCreateFromStatistics(params: StatisticsCreateParams): boolean {
  const config = buildStatisticsCreateConfig(params);
  if (!config) {
    params.uiPort.notice('当前统计格缺少明确分类，已不再提供创建入口。');
    return false;
  }
  return openCreateModal(params.app, config, 'view_quick_create');
}
