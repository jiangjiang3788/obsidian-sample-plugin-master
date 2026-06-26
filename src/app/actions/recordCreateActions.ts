import { QuickInputModal } from '@/app/public';
import type { ActionService, Item, TaskBlock, ThemeDefinition, UiPort, ViewInstance } from '@core/public';
import { dayjs, getItemThemePath, minutesToTime, type Dayjs, type ThemeDefinition as ThemeDefinitionType, type QuickInputConfig, type RecordInputSource } from '@core/public';

export const MODULE_HEADER_CREATE_ALLOWLIST = ['TimelineView', 'HeatmapView'] as const;

type ModuleHeaderCreateAllowedView = typeof MODULE_HEADER_CREATE_ALLOWLIST[number];

type StatisticsPeriodType = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface StatisticsCellIdentifier {
  type?: StatisticsPeriodType | string;
  category?: string;
  date?: string;
  week?: number;
  month?: number;
  quarter?: number;
  year?: number;
}

export interface StatisticsCreatePayload {
  /** 目标总览等入口透传给 QuickInput 的上下文字段。 */
  context?: Record<string, unknown>;
  /** 建议使用的核心 block，兼容后续更精确的 actionService 选择。 */
  preferredBlockId?: string;
  cellIdentifier?: StatisticsCellIdentifier | null;
  blocks?: Item[];
  title?: string;
}

export interface TimelineCreateParams {
  app: any;
  uiPort: UiPort;
  inputBlocks: any[];
  hourHeight: number;
  dayBlocks: TaskBlock[];
  day: string;
  event: MouseEvent | TouchEvent;
}

export interface HeatmapCreateParams {
  app: any;
  sourceBlockId?: string | null;
  date: string;
  item?: Item;
  themePath?: string;
  goalPath?: string;
  goalId?: string;
  templateId?: string;
  templateVariantId?: string;
  themesByPath?: Map<string, ThemeDefinition>;
  notice?: (message: string) => void;
}

export interface StatisticsCreateParams {
  app: any;
  actionService: ActionService;
  uiPort: UiPort;
  viewInstance: ViewInstance;
  currentView: '年' | '季' | '月' | '周' | '天';
  fallbackDate: Dayjs;
  payload?: StatisticsCreatePayload;
}

export interface HeaderCreateParams {
  app: any;
  actionService: ActionService;
  viewInstance: ViewInstance;
  dateContext: Dayjs;
  periodContext: string;
}

function openCreateModal(app: any, config: QuickInputConfig | null | undefined, source: Extract<RecordInputSource, 'quickinput' | 'view_quick_create'> = 'view_quick_create'): boolean {
  if (!config?.blockId) return false;
  new QuickInputModal(app, config.blockId, config.context, config.themeId, undefined, false, {
    mode: 'create',
    source,
  }).open();
  return true;
}

function findTaskBlock(inputBlocks: any[]): any | null {
  if (!Array.isArray(inputBlocks) || inputBlocks.length === 0) return null;
  return inputBlocks.find((b: any) => b.name === 'Task' || b.name === '任务') || inputBlocks[0] || null;
}

function getEventClientY(event: MouseEvent | TouchEvent): number {
  if ('touches' in event && event.touches?.length) {
    return event.touches[0].clientY;
  }
  if ('changedTouches' in event && event.changedTouches?.length) {
    return event.changedTouches[0].clientY;
  }
  return (event as MouseEvent).clientY;
}

function buildTimelineCreateConfig(params: TimelineCreateParams): QuickInputConfig | null {
  const taskBlock = findTaskBlock(params.inputBlocks);
  if (!taskBlock) {
    params.uiPort.notice('没有可用的 Block 模板，请先在设置中创建一个。');
    return null;
  }

  const targetEl = params.event.currentTarget as HTMLElement | null;
  if (!targetEl) return null;

  const rect = targetEl.getBoundingClientRect();
  const clientY = getEventClientY(params.event);
  const y = clientY - rect.top;
  const clickedMinute = Math.max(0, Math.floor((y / params.hourHeight) * 60));

  const prevBlock = params.dayBlocks.filter((b) => b.blockEndMinute <= clickedMinute).pop();
  const nextBlock = params.dayBlocks.find((b) => b.blockStartMinute >= clickedMinute);

  const context: Record<string, any> = {
    日期: params.day,
    __recordUiContext: {
      kind: 'timeline_create',
      timeContext: {
        date: params.day,
        clickedMinute,
      },
    },
  };

  if (prevBlock) {
    context['时间'] = minutesToTime(prevBlock.blockEndMinute);
  } else {
    context['时间'] = minutesToTime(clickedMinute);
  }
  if (nextBlock) {
    context['结束'] = minutesToTime(nextBlock.blockStartMinute);
  }

  return {
    blockId: taskBlock.id,
    context,
  };
}

function resolveHeatmapThemeId(themesByPath: Map<string, ThemeDefinitionType> | undefined, themePath?: string, item?: Item): string | undefined {
  if (!themesByPath) return undefined;
  if (themePath && themePath !== '__default__') {
    return themesByPath.get(themePath)?.id;
  }
  const itemThemePath = getItemThemePath(item);
  if (itemThemePath) {
    return themesByPath.get(itemThemePath)?.id;
  }
  return undefined;
}


function firstNonEmptyText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      const option = value as Record<string, unknown>;
      const nested = firstNonEmptyText(option.value, option.label, option.path, option.title);
      if (nested) return nested;
      continue;
    }
    const text = String(value).trim();
    if (text) return text;
  }
  return undefined;
}

function buildHeatmapRatingContext(item?: Item): Record<string, unknown> {
  if (!item) return {};
  const score = firstNonEmptyText(item.rating, (item as any).extra?.['评分'], (item as any).extra?.rating);
  const visual = firstNonEmptyText(item.pintu, item.image, (item as any).extra?.['图片'], (item as any).extra?.['评图'], (item as any).extra?.pintu, (item as any).extra?.image);
  if (!score && !visual) return {};
  return {
    评分: {
      value: visual || score || '',
      label: score || visual || '',
    },
  };
}

function buildHeatmapCreateConfig(params: HeatmapCreateParams): QuickInputConfig | null {
  const resolvedBlockId = params.sourceBlockId || params.item?.templateId || params.item?.categoryKey;
  if (!resolvedBlockId) return null;

  const themeId = resolveHeatmapThemeId(params.themesByPath, params.themePath, params.item);
  const themePath = params.themePath && params.themePath !== '__default__'
    ? params.themePath
    : getItemThemePath(params.item);

  const goalContext = (params.goalPath || params.goalId || params.templateId || params.templateVariantId)
    ? {
        ...(params.goalPath ? { goalPath: params.goalPath } : {}),
        ...(params.goalId ? { goalId: params.goalId } : {}),
        ...(params.templateId ? { templateId: params.templateId, goalTemplateId: params.templateId } : {}),
        ...(params.templateVariantId ? { templateVariantId: params.templateVariantId, goalTemplateVariantId: params.templateVariantId } : {}),
      }
    : null;

  const context: Record<string, any> = {
    日期: params.date,
    __recordUiContext: {
      kind: 'heatmap_create',
      timeContext: { date: params.date },
      themeContext: themePath ? { themePath } : null,
      goalContext,
    },
    ...(params.item ? { 内容: params.item.content || '' } : {}),
    ...buildHeatmapRatingContext(params.item),
  };

  if (themePath) {
    context['主题'] = themePath;
    context.themePath = themePath;
  }

  if (params.goalPath) {
    context['目标'] = params.goalPath;
    context.goalPath = params.goalPath;
  }

  if (params.goalId) {
    context['目标ID'] = params.goalId;
    context.goalId = params.goalId;
  }

  if (params.templateId) {
    context['模板ID'] = params.templateId;
    context.templateId = params.templateId;
    context.goalTemplateId = params.templateId;
  }

  if (params.templateVariantId) {
    context.templateVariantId = params.templateVariantId;
    context.goalTemplateVariantId = params.templateVariantId;
  }

  return {
    blockId: resolvedBlockId,
    context,
    themeId,
  };
}

function mapStatisticsCellTypeToPeriod(type?: string, fallback: '年' | '季' | '月' | '周' | '天' = '月'): '年' | '季' | '月' | '周' | '天' {
  switch (type) {
    case 'day': return '天';
    case 'week': return '周';
    case 'month': return '月';
    case 'quarter': return '季';
    case 'year': return '年';
    default: return fallback;
  }
}

function resolveStatisticsAnchorDate(cell: StatisticsCellIdentifier | null | undefined, fallbackDate: Dayjs): Dayjs {
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
      goalContext: (payload?.context as any)?.__goalContext || null,
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
      context: buildStatisticsExplicitContext(params.payload, anchorDate, periodContext, params.viewInstance.filters, undefined),
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
      ...buildStatisticsExplicitContext(params.payload, anchorDate, periodContext, params.viewInstance.filters, base.themeId),
    },
  };
}

export function isModuleHeaderCreateAllowed(viewType: string): viewType is ModuleHeaderCreateAllowedView {
  return MODULE_HEADER_CREATE_ALLOWLIST.includes(viewType as ModuleHeaderCreateAllowedView);
}

export function canCreateFromStatisticsCell(payload?: StatisticsCreatePayload): boolean {
  const category = payload?.cellIdentifier?.category;
  return !!category && category !== '全部';
}

export function openCreateFromViewHeader(params: HeaderCreateParams): boolean {
  if (!isModuleHeaderCreateAllowed(params.viewInstance.viewType)) return false;
  const config = params.actionService.getQuickInputConfigForView(
    params.viewInstance,
    params.dateContext,
    params.periodContext,
  );
  return openCreateModal(params.app, config, 'view_quick_create');
}

export function openCreateFromTimeline(params: TimelineCreateParams): boolean {
  return openCreateModal(params.app, buildTimelineCreateConfig(params), 'view_quick_create');
}

export function openCreateFromHeatmap(params: HeatmapCreateParams): boolean {
  const config = buildHeatmapCreateConfig(params);
  if (!config) {
    params.notice?.('当前热力图没有可用于新增的模板，请先为该热力图配置 sourceBlockId，或保证该主题下至少已有一条记录可供推断模板。');
    return false;
  }
  return openCreateModal(params.app, config, 'view_quick_create');
}

export function openCreateFromStatistics(params: StatisticsCreateParams): boolean {
  const config = buildStatisticsCreateConfig(params);
  if (!config) {
    params.uiPort.notice('当前统计格缺少明确分类，已不再提供创建入口。');
    return false;
  }
  return openCreateModal(params.app, config, 'view_quick_create');
}
