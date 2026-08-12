// src/features/settings/views/runtime/StatisticsView.tsx
/** @jsxImportSource preact */
import { useMemo, useRef, useState } from 'preact/hooks';
import type { InputSettings, RecordViewItem, ViewInstance } from '@core/types/public';
import type { GoalDefinition } from '@core/goal/public';
import type { MessageRenderPort } from '@core/ports/public';
import { exportItemsToMarkdown, getExportConfigByViewType, devLog } from '@core/utils/public';
import type { CategoryColorMap, CloseStatisticsPopoverHandler, NoticeHandler, OpenQuickCreateHandler, OpenRecordHandler, OpenRecordOriginHandler, OpenStatisticsPopoverHandler, ResolveResourcePathHandler, TimerController, UpdateCategoryColorsHandler } from '@shared/types/public';
import { StatisticsViewView } from './StatisticsViewView';
import {
  buildStatisticsGoalBuckets,
  buildStatisticsGoalThemeSummaries,
  buildStatisticsProcessedData,
  buildStatisticsViewConfig,
  getStatisticsPopoverWidgetId,
  isSameStatisticsCell,
  isStatisticsYearView,
  resolveStatisticsBucketAccessor,
  resolveStatisticsStartDate,
  resolveStatisticsYear,
  resolveYearlyWeekStructure,
} from './StatisticsViewModel';

interface StatisticsViewProps {
  items: RecordViewItem[];
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
  goals?: GoalDefinition[];
  inputSettings?: InputSettings;
  messageRenderPort?: MessageRenderPort;
  onOpenRecord?: OpenRecordHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
}

interface PopoverState {
  blocks: RecordViewItem[];
  title: string;
}

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
  goals = [],
  inputSettings,
  messageRenderPort,
  onOpenRecord,
  onOpenRecordOrigin,
}: StatisticsViewProps) {
  const viewConfig = buildStatisticsViewConfig(module);
  const { displayMode = 'smart', minVisibleHeight = 15 } = viewConfig;
  const filteredCategories = useMemo(() => buildStatisticsGoalBuckets({
    items,
    goals,
    themes: inputSettings?.themes || [],
    topN: viewConfig.topN,
  }), [items, goals, inputSettings?.themes, viewConfig.topN]);
  const bucketAccessor = useMemo(() => resolveStatisticsBucketAccessor(goals), [goals]);
  const goalThemeSummaries = useMemo(() => buildStatisticsGoalThemeSummaries(items, filteredCategories, goals), [items, filteredCategories, goals]);
  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const openLockRef = useRef(false);
  const [usePeriod, setUsePeriod] = useState<boolean>(Boolean(viewConfig.usePeriodField));

  const startDate = useMemo(() => resolveStatisticsStartDate(dateRange), [dateRange]);
  const isYearView = isStatisticsYearView(currentView);
  const year = resolveStatisticsYear(startDate);
  const yearlyWeekStructure = useMemo(() => resolveYearlyWeekStructure({ year, isYearView }), [isYearView, year]);
  const processedData = useMemo(() => buildStatisticsProcessedData({
    isYearView,
    items,
    year,
    filteredCategories,
    usePeriod,
    bucketAccessor,
  }), [bucketAccessor, filteredCategories, isYearView, items, usePeriod, year]);

  const handleCellClick = (cellIdentifier: any, _target: HTMLElement, blocks: RecordViewItem[], title: string) => {
    devLog('点击单元格:', { cellIdentifier, title, blocksCount: blocks.length, blocks });
    if (openLockRef.current) return;

    const widgetId = getStatisticsPopoverWidgetId(module.id);
    if (popover && isSameStatisticsCell(selectedCell, cellIdentifier)) {
      onCloseStatisticsPopover?.(widgetId);
      setPopover(null);
      setSelectedCell(null);
      return;
    }

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
      navigator.clipboard.writeText(exportItemsToMarkdown(blocks, exportConfig));
      onNotice?.(`"${title}" 的内容已复制到剪贴板！`);
    };

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
      canQuickCreate: false,
    });

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
      goalThemeSummaries={goalThemeSummaries}
    />
  );
}
