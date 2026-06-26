// src/shared/ui/views/StatisticsView.tsx
/** @jsxImportSource preact */
import { useState, useMemo, useRef } from 'preact/hooks';
import type { Item, ViewInstance, MessageRenderPort } from '@core/public';
import type { PeriodData } from '@core/public';
import {
  dayjs,
  getWeeksInYear,
  STATISTICS_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG,
  exportItemsToMarkdown,
  getExportConfigByViewType,
  aggregateByWeek,
  aggregateByMonth,
  aggregateByQuarter,
  aggregateByYear,
  createPeriodData,
  devLog,
  getItemGoalKey,
} from '@core/public';
import type { CategoryColorMap, CloseStatisticsPopoverHandler, NoticeHandler, OpenQuickCreateHandler, OpenRecordHandler, OpenRecordOriginHandler, OpenStatisticsPopoverHandler, ResolveResourcePathHandler, TimerController, UpdateCategoryColorsHandler } from '../../../types/actions';
import { StatisticsViewView } from './StatisticsViewView';
import { useStatisticsCategoryConfigs } from './useStatisticsCategoryConfigs';

// =============== 类型定义 ===============
interface StatisticsViewProps {
  items: Item[];
  resolveResourcePath?: ResolveResourcePathHandler;
  dateRange: [Date, Date];
  module: ViewInstance;
  currentView: '年' | '季' | '月' | '周' | '天';
  useFieldGranularity?: boolean;
  onQuickCreate?: OpenQuickCreateHandler;
  onNotice?: NoticeHandler;
  onOpenStatisticsPopover?: OpenStatisticsPopoverHandler;
  onCloseStatisticsPopover?: CloseStatisticsPopoverHandler;
  categoryColors?: CategoryColorMap;
  onCategoryColorsChange?: UpdateCategoryColorsHandler;
  selectedCategories?: string[];
  timerService: TimerController;
  timers: any[];
  allThemes: any[];
  /** Phase2: feature 层注入的 renderModel（shared/ui 只渲染） */
  statisticsModel?: any;
  messageRenderPort?: MessageRenderPort;
  onOpenRecord?: OpenRecordHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
}

interface PopoverState {
  blocks: Item[];
  title: string;
}

// =============== 主视图组件（Container） ===============
export function StatisticsView({
  items,
  resolveResourcePath,
  dateRange,
  module,
  currentView,
  onQuickCreate: _onQuickCreate,
  onNotice,
  onOpenStatisticsPopover,
  onCloseStatisticsPopover,
  categoryColors = {},
  onCategoryColorsChange,
  selectedCategories: _selectedCategories,
  timerService,
  timers,
  allThemes,
  statisticsModel,
  messageRenderPort,
  onOpenRecord,
  onOpenRecordOrigin,
}: StatisticsViewProps) {
  const viewConfig = statisticsModel?.viewConfig ?? ({ ...DEFAULT_CONFIG, ...module.viewConfig } as any);
  const { displayMode = 'smart', minVisibleHeight = 15 } = viewConfig;

  // MVP12.3: Statistics 的主维度严格固定为目标。
  // 正常路径由 feature 层的 statisticsModel 注入 goalBuckets；fallback 仅用于旧包/旧调用，
  // 且不再接收 selectedCategories，避免外部分类选择误裁剪目标柱。
  const fallbackCategories = useStatisticsCategoryConfigs({
    items,
    configuredCategories: [],
    selectedCategories: undefined,
    categoryColors,
    onCategoryColorsChange,
    injectedFilteredCategories: undefined,
  });
  const filteredCategories = Array.isArray(statisticsModel?.filteredCategories)
    ? statisticsModel.filteredCategories
    : fallbackCategories;

  const bucketAccessor = statisticsModel?.bucketAccessor || getItemGoalKey;

  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const openLockRef = useRef(false);

  // 时间范围仍由外部控制栏和视图筛选统一控制；
  // 这里的 usePeriod 只保留原 Statistics 的“按照周期字段显示”开关，
  // 用于年/季/月视图内部按 period 字段筛选对应粒度记录，不再承担全局时间控制职责。
  const [usePeriod, setUsePeriod] = useState<boolean>(Boolean(viewConfig.usePeriodField));

  const startDate = useMemo(() => statisticsModel?.startDate ?? dayjs(dateRange[0]), [statisticsModel, dateRange]);

  // 年视图相关：必须在组件顶层计算，避免 Hook 顺序变化
  const isYearView = statisticsModel?.isYearView ?? currentView === '年';
  const year = statisticsModel?.year ?? startDate.year();

  const yearlyWeekStructure = useMemo(() => {
    if (statisticsModel?.yearlyWeekStructure) return statisticsModel.yearlyWeekStructure;
    if (!isYearView) return [];

    const months: { month: number; weeks: number[] }[] = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, weeks: [] }));
    const totalWeeks = getWeeksInYear(year);

    for (let week = 1; week <= totalWeeks; week++) {
      const thursdayOfWeek = dayjs().year(year).isoWeek(week).day(4);
      months[thursdayOfWeek.month()]?.weeks.push(week);
    }
    return months;
  }, [statisticsModel, isYearView, year]);

  const processedData = useMemo(() => {
    // 仅保留原 Year/Quarter/Month/Week 周期结构；时间范围和周期由外部控制栏统一决定。
    // 这里重新计算是为了让 shared/ui 在旧调用缺少 statisticsModel 时仍可渲染，
    // 统计维度仍固定为目标 bucketAccessor。
    if (!isYearView) return { yearData: createPeriodData(filteredCategories), quartersData: [], monthsData: [], weeksData: [] };

    const totalWeeks = getWeeksInYear(year);
    const targetDate = dayjs().year(year);

    const yearData = aggregateByYear(items, filteredCategories, targetDate, usePeriod, bucketAccessor);

    const quartersData: PeriodData[] = [];
    for (let q = 1; q <= 4; q++) quartersData.push(aggregateByQuarter(items, filteredCategories, targetDate.quarter(q), usePeriod, bucketAccessor));

    const monthsData: PeriodData[] = [];
    for (let m = 0; m < 12; m++) monthsData.push(aggregateByMonth(items, filteredCategories, targetDate.month(m), usePeriod, bucketAccessor));

    const weeksData: PeriodData[] = [];
    for (let w = 1; w <= totalWeeks; w++) weeksData.push(aggregateByWeek(items, filteredCategories, targetDate.isoWeek(w), usePeriod, bucketAccessor));

    return { yearData, quartersData, monthsData, weeksData };
  }, [isYearView, items, year, filteredCategories, usePeriod, bucketAccessor]);

  const handleCellClick = (cellIdentifier: any, _target: HTMLElement, blocks: Item[], title: string) => {
    devLog('点击单元格:', { cellIdentifier, title, blocksCount: blocks.length, blocks });

    // 防止同一次点击被触发多次（导致立即打开后又关闭）
    if (openLockRef.current) return;

    const widgetId = `stats-popover-${module.id}`;

    // 切换：如果相同则关闭当前浮窗，否则打开新的浮窗
    const currentKey = JSON.stringify(cellIdentifier);
    if (popover && JSON.stringify(selectedCell) === currentKey) {
      onCloseStatisticsPopover?.(widgetId);
      setPopover(null);
      setSelectedCell(null);
      return;
    }

    // 打开新的浮窗 widget（先关闭旧实例，避免残留）
    onCloseStatisticsPopover?.(widgetId);

    setSelectedCell(cellIdentifier);
    setPopover({ blocks, title });

    const handleClose = () => {
      onCloseStatisticsPopover?.(widgetId);
      setPopover(null);
      setSelectedCell(null);
    };

    const handleExport = () => {
      if (blocks.length === 0) {
        onNotice?.('没有内容可导出');
        return;
      }
      const exportConfig = getExportConfigByViewType('StatisticsView');
      const markdownContent = exportItemsToMarkdown(blocks, exportConfig);
      navigator.clipboard.writeText(markdownContent);
      onNotice?.(`"${title}" 的内容已复制到剪贴板！`);
    };

    // 视图只负责展示；新增数据统一走快捷输入面板，不在 Statistics popover 内创建。
    const canQuickCreate = false;

    onOpenStatisticsPopover?.({
      widgetId,
      title,
      blocks,
      module,
      timerService,
      timers,
      allThemes,
      messageRenderPort,
      onOpenRecord,
      onOpenRecordOrigin,
      resolveResourcePath,
      onClose: handleClose,
      onExport: handleExport,
      onQuickCreate: undefined,
      canQuickCreate,
    });

    // 设置短期锁，避免连续触发
    openLockRef.current = true;
    setTimeout(() => {
      openLockRef.current = false;
    }, 300);
  };

  return (
    <StatisticsViewView
      items={items}
      currentView={currentView}
      categories={filteredCategories}
      startDate={startDate}
      usePeriod={usePeriod}
      onToggleUsePeriod={setUsePeriod}
      onCellClick={handleCellClick}
      displayMode={displayMode}
      minVisibleHeight={minVisibleHeight}
      year={year}
      yearlyWeekStructure={yearlyWeekStructure}
      processedData={processedData}
      bucketAccessor={bucketAccessor}
      goalThemeSummaries={statisticsModel?.goalThemeSummaries || []}
    />
  );
}
