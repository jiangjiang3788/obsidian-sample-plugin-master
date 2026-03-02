// src/shared/ui/views/StatisticsView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useMemo, useRef } from 'preact/hooks';
import type { Item, ViewInstance } from '@core/public';
import type { CategoryConfig, PeriodData } from '@core/public';
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
} from '@core/public';
import { IconButton, Tooltip } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import IosShareIcon from '@mui/icons-material/IosShare';
import { FloatingPanel, openFloatingWidget, closeFloatingWidget, useUiPort } from '@/app/public';
import type { TimerController } from '@/app/public';
import type { OpenQuickCreateHandler } from '@shared/types/actions';
import { PopoverContent } from './components/PopoverContent';
import { StatisticsViewView } from './StatisticsViewView';

// 解决 Preact 和 Material-UI 的类型兼容性问题
const AnyIconButton = IconButton as any;

// =============== 类型定义 ===============
interface StatisticsViewProps {
  items: Item[];
  app: any;
  dateRange: [Date, Date];
  module: ViewInstance;
  currentView: '年' | '季' | '月' | '周' | '天';
  useFieldGranularity?: boolean;
  onQuickCreate?: OpenQuickCreateHandler;
  selectedCategories?: string[];
  timerService: TimerController;
  timers: any[];
  allThemes: any[];
  /** Phase2: feature 层注入的 renderModel（shared/ui 只渲染） */
  statisticsModel?: any;
}

interface PopoverState {
  blocks: Item[];
  title: string;
}

// =============== 主视图组件（Container） ===============
export function StatisticsView({
  items,
  app,
  dateRange,
  module,
  currentView,
  onQuickCreate,
  selectedCategories,
  timerService,
  timers,
  allThemes,
  statisticsModel,
}: StatisticsViewProps) {
  const ui = useUiPort();

  const viewConfig = statisticsModel?.viewConfig ?? ({ ...DEFAULT_CONFIG, ...module.viewConfig } as any);
  const { categories = [], displayMode = 'smart', minVisibleHeight = 15, usePeriodField = false } = viewConfig;

  const categoryConfigs = categories as CategoryConfig[];

  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const openLockRef = useRef(false);

  // 周期字段使用状态（用户可切换）
  const [usePeriod, setUsePeriod] = useState(Boolean(usePeriodField));

  const startDate = useMemo(() => statisticsModel?.startDate ?? dayjs(dateRange[0]), [statisticsModel, dateRange]);

  // 过滤后的分类列表
  const filteredCategories = useMemo(() => {
    if (statisticsModel?.filteredCategories) return statisticsModel.filteredCategories;
    if (!selectedCategories || selectedCategories.length === 0) return categoryConfigs;
    return categoryConfigs.filter((c: CategoryConfig) => selectedCategories.includes(c.name));
  }, [statisticsModel, categoryConfigs, selectedCategories]);

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
    // 不使用 statisticsModel.processedData 的预计算结果，
    // 始终在本地基于 usePeriod 状态重新计算，确保勾选"使用周期字段"时数据能正确响应。
    if (!isYearView) return { yearData: createPeriodData(filteredCategories), quartersData: [], monthsData: [], weeksData: [] };

    const totalWeeks = getWeeksInYear(year);
    const targetDate = dayjs().year(year);

    const yearData = aggregateByYear(items, filteredCategories, targetDate, usePeriod);

    const quartersData: PeriodData[] = [];
    for (let q = 1; q <= 4; q++) quartersData.push(aggregateByQuarter(items, filteredCategories, targetDate.quarter(q), usePeriod));

    const monthsData: PeriodData[] = [];
    for (let m = 0; m < 12; m++) monthsData.push(aggregateByMonth(items, filteredCategories, targetDate.month(m), usePeriod));

    const weeksData: PeriodData[] = [];
    for (let w = 1; w <= totalWeeks; w++) weeksData.push(aggregateByWeek(items, filteredCategories, targetDate.isoWeek(w)));

    return { yearData, quartersData, monthsData, weeksData };
  }, [isYearView, items, year, filteredCategories, usePeriod]);

  const handleCellClick = (cellIdentifier: any, _target: HTMLElement, blocks: Item[], title: string) => {
    devLog('点击单元格:', { cellIdentifier, title, blocksCount: blocks.length, blocks });

    // 防止同一次点击被触发多次（导致立即打开后又关闭）
    if (openLockRef.current) return;

    const widgetId = `stats-popover-${module.id}`;

    // 切换：如果相同则关闭当前浮窗，否则打开新的浮窗
    const currentKey = JSON.stringify(cellIdentifier);
    if (popover && JSON.stringify(selectedCell) === currentKey) {
      closeFloatingWidget(widgetId);
      setPopover(null);
      setSelectedCell(null);
      return;
    }

    // 打开新的浮窗 widget（先关闭旧实例，避免残留）
    closeFloatingWidget(widgetId);

    setSelectedCell(cellIdentifier);
    setPopover({ blocks, title });

    const handleClose = () => {
      closeFloatingWidget(widgetId);
      setPopover(null);
      setSelectedCell(null);
    };

    const handleExport = () => {
      if (blocks.length === 0) {
        ui.notice('没有内容可导出');
        return;
      }
      const exportConfig = getExportConfigByViewType('StatisticsView');
      const markdownContent = exportItemsToMarkdown(blocks, exportConfig);
      navigator.clipboard.writeText(markdownContent);
      ui.notice(`"${title}" 的内容已复制到剪贴板！`);
    };

    const handleQuickCreate = () => {
      onQuickCreate?.();
    };

    openFloatingWidget(widgetId, () => (
      <FloatingPanel
        id={widgetId}
        title={title}
        defaultPosition={{ x: window.innerWidth / 2 - 320, y: window.innerHeight / 2 - 240 }}
        minWidth={520}
        maxWidth="90vw"
        maxHeight="85vh"
        bodyPadding={0}
        onClose={handleClose}
        headerActions={
          <div class="flex items-center gap-1">
            <Tooltip title="导出为 Markdown" PopperProps={{ disablePortal: true }}>
              <AnyIconButton
                size="small"
                onClick={(e: any) => {
                  e.stopPropagation();
                  handleExport();
                }}
                sx={{ padding: '4px' }}
              >
                <IosShareIcon sx={{ fontSize: '1rem' }} />
              </AnyIconButton>
            </Tooltip>
            <Tooltip title="快捷创建" PopperProps={{ disablePortal: true }}>
              <AnyIconButton
                size="small"
                onClick={(e: any) => {
                  e.stopPropagation();
                  handleQuickCreate();
                }}
                sx={{ padding: '4px' }}
              >
                <AddCircleOutlineIcon sx={{ fontSize: '1rem' }} />
              </AnyIconButton>
            </Tooltip>
          </div>
        }
      >
        <PopoverContent blocks={blocks} app={app} module={module} timerService={timerService} timers={timers} allThemes={allThemes} />
      </FloatingPanel>
    ));

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
      onToggleUsePeriod={(next) => setUsePeriod(next)}
      onCellClick={handleCellClick}
      displayMode={displayMode}
      minVisibleHeight={minVisibleHeight}
      year={year}
      yearlyWeekStructure={yearlyWeekStructure}
      processedData={processedData}
    />
  );
}
