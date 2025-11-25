// src/features/dashboard/ui/StatisticsView.tsx
/** @jsxImportSource preact */
import { h, Fragment } from 'preact';
import { useState, useMemo, useEffect, useRef } from 'preact/hooks';
import { Item, readField, ViewInstance } from '@/core/types/schema';
import { dayjs, getWeeksInYear } from '@core/utils/date';
import { App, Notice } from 'obsidian';
// [架构标准化] 从core配置导入，避免features间依赖违规
import { STATISTICS_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '../../core/config/viewConfigs';
import { BlockView } from './BlockView';
import { IconButton, Tooltip } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import IosShareIcon from '@mui/icons-material/IosShare';
import { exportItemsToMarkdown } from '@core/utils/exportUtils';
import { QuickInputModal } from '@/features/quickinput/QuickInputModal';
import { dayjs as dayjsUtil } from '@core/utils/date';
import type { CategoryConfig, PeriodData } from '@core/utils/statisticsAggregation';
import { 
    aggregateByDay,
    aggregateByWeek,
    aggregateByMonth,
    aggregateByQuarter,
    aggregateByYear,
    getMonthWeeksData,
    createPeriodData
} from '@core/utils/statisticsAggregation';
import { ChartBlock } from '@shared/ui/statistics/ChartBlock';
import type { TimerService } from '@features/timer/TimerService';

// 解决 Preact 和 Material-UI 的类型兼容性问题
const AnyIconButton = IconButton as any;

// ... 文件剩余部分代码保持不变 ...
// =============== 类型定义 ===============
interface StatisticsViewProps {
    items: Item[];
    app: App;
    dateRange: [Date, Date];
    module: ViewInstance;
    currentView: '年' | '季' | '月' | '周' | '天';
    useFieldGranularity?: boolean;
    actionService?: any;
    selectedCategories?: string[];
    timerService: TimerService;
    timers: any[];
    allThemes: any[];
}
interface PopoverState {
    target: HTMLElement;
    blocks: Item[];
    title: string;
}

// =============== 悬浮窗组件 ===============
const Popover = ({ target, blocks, title, onClose, app, module, actionService, dateRange, currentView, timerService, timers, allThemes }: PopoverState & { 
    onClose: () => void; 
    app: App; 
    module: ViewInstance;
    actionService?: any;
    dateRange: [Date, Date];
    currentView: string;
    timerService: TimerService;
    timers: any[];
    allThemes: any[];
}) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // 初始化位置为屏幕中央
    useEffect(() => {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        setPosition({ x: centerX, y: centerY });
    }, []);

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 50);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // 拖动功能
    const handleMouseDown = (e: MouseEvent) => {
        // 只在标题栏上才能拖动
        if ((e.target as HTMLElement).closest('.sv-popover-title')) {
            setIsDragging(true);
            setDragStart({
                x: e.clientX - position.x,
                y: e.clientY - position.y
            });
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart]);

    const style = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        cursor: isDragging ? 'grabbing' : 'default',
    };

    // 导出功能
    const handleExport = () => {
        if (blocks.length === 0) {
            new Notice('没有内容可导出');
            return;
        }
        const markdownContent = exportItemsToMarkdown(blocks, title);
        navigator.clipboard.writeText(markdownContent);
        new Notice(`"${title}" 的内容已复制到剪贴板！`);
    };

    return (
        <div ref={popoverRef} style={style} className="sv-popover" onMouseDown={handleMouseDown}>
            <div className="sv-popover-title">
                <span>{title}</span>
                <div class="flex items-center gap-1">
                    {/* 导出按钮 */}
                    <Tooltip title="导出为 Markdown">
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
                    {/* 快捷创建按钮 */}
                    <Tooltip title="快捷创建">
                        <AnyIconButton
                            size="small"
                            onClick={(e: any) => {
                                e.stopPropagation();
                                if (actionService) {
                                    const layoutDate = dayjsUtil(dateRange[0]);
                                    const config = actionService.getQuickInputConfigForView(module, layoutDate, currentView);
                                    if (config) {
                                        new QuickInputModal(app, config.blockId, config.context, config.themeId).open();
                                    }
                                }
                            }}
                            sx={{ padding: '4px' }}
                        >
                            <AddCircleOutlineIcon sx={{ fontSize: '1rem' }} />
                        </AnyIconButton>
                    </Tooltip>
                </div>
            </div>
            <div className="sv-popover-content">
                {blocks.length === 0 ? <div class="sv-popover-empty">无内容</div> :
                    <BlockView 
                        items={blocks} 
                        app={app} 
                        fields={module.fields || ['title', 'content', 'categoryKey', 'tags', 'date', 'period']} 
                        groupField={module.group} 
                        onMarkDone={() => {}} 
                        timerService={timerService}
                        timers={timers}
                        allThemes={allThemes}
                    />
                }
            </div>
        </div>
    );
};




// =============== 主视图组件 ===============
export function StatisticsView({ items, app, dateRange, module, currentView, useFieldGranularity = false, actionService, selectedCategories, timerService, timers, allThemes }: StatisticsViewProps) {
    const { categories = [], displayMode = 'smart', minVisibleHeight = 15, usePeriodField = false } = { ...DEFAULT_CONFIG, ...module.viewConfig };
    const categoryConfigs = categories as CategoryConfig[];
    const categoryOrder = useMemo(() => categoryConfigs.map((c: CategoryConfig) => c.name), [categoryConfigs]);
    const [selectedCell, setSelectedCell] = useState<any>(null);
    const [popover, setPopover] = useState<PopoverState | null>(null);
    // 周期字段使用状态
    const [usePeriod, setUsePeriod] = useState(usePeriodField);
    
    const startDate = useMemo(() => dayjs(dateRange[0]), [dateRange]);
    const endDate = useMemo(() => dayjs(dateRange[1]), [dateRange]);

    // [修复] 只在分类配置实际改变时才更新选中状态，避免主题筛选时重置
    const categoryOrderKey = useMemo(() => categoryOrder.join(','), [categoryOrder]);
    const prevCategoryOrderKeyRef = useRef<string>('');

    // 过滤后的分类列表
    const filteredCategories = useMemo(() => {
        if (!selectedCategories || selectedCategories.length === 0) {
            return categoryConfigs;
        }
        return categoryConfigs.filter((c: CategoryConfig) => selectedCategories.includes(c.name));
    }, [categoryConfigs, selectedCategories]);


    const handleCellClick = (cellIdentifier: any, target: HTMLElement, blocks: Item[], title: string) => {
        console.log('点击单元格:', { cellIdentifier, title, blocksCount: blocks.length, blocks });
        if (JSON.stringify(cellIdentifier) === JSON.stringify(selectedCell)) {
            setPopover(null);
            setSelectedCell(null);
        } else {
            setSelectedCell(cellIdentifier);
            setPopover({ target, blocks, title });
        }
    };
    
    if (!categories || categories.length === 0) {
        return <div class="statistics-view-placeholder">请先在视图设置中配置您想统计的分类。</div>;
    }

    // 顶部控制栏组件
    const TopControls = () => {
        // 只在年、季度、月视图中显示控制栏，周和天视图不显示任何内容
        if (!(currentView === '年' || currentView === '季' || currentView === '月')) {
            return null;
        }
        
        return (
            <div class="sv-top-controls">
                <label class="sv-period-toggle" title="勾选后，有周期字段的条目按周期过滤，无周期字段的条目按时间归属显示">
                    <input 
                        type="checkbox" 
                        checked={usePeriod} 
                        onChange={(e) => setUsePeriod((e.target as HTMLInputElement).checked)}
                    />
                    <span>使用周期字段</span>
                </label>
            </div>
        );
    };

    // 根据 currentView 渲染不同的专属视图
    if (currentView === '天') {
        // 天视图：显示选定日期的统计数据
        const selectedDate = startDate;
        const data = aggregateByDay(items, filteredCategories, selectedDate);

        return (
            <div class="statistics-view">
                <div class="sv-timeline">
                    <div class="sv-row">
                        <ChartBlock
                            data={data}
                            label={selectedDate.format('YYYY年MM月DD日 dddd')}
                            categories={filteredCategories}
                            onCellClick={handleCellClick}
                            cellIdentifier={(cat: string) => ({ type: 'day', date: selectedDate.format('YYYY-MM-DD'), category: cat })}
                            displayMode={displayMode}
                            minVisibleHeight={minVisibleHeight}
                        />
                    </div>
                </div>
                {popover && <Popover {...popover} onClose={() => { setPopover(null); setSelectedCell(null); }} app={app} module={module} actionService={actionService} dateRange={dateRange} currentView={currentView} timerService={timerService} timers={timers} allThemes={allThemes} />}
            </div>
        );
    }

    if (currentView === '周') {
        // 周视图：显示选定周的整体统计数据
        const weekStart = startDate.startOf('isoWeek');
        const weekEnd = startDate.endOf('isoWeek');
        const data = aggregateByWeek(items, filteredCategories, weekStart);

        return (
            <div class="statistics-view">
                <div class="sv-timeline">
                    <div class="sv-row">
                        <ChartBlock
                            data={data}
                            label={`${weekStart.format('YYYY年MM月DD日')} ~ ${weekEnd.format('MM月DD日')} (第${weekStart.isoWeek()}周)`}
                            categories={filteredCategories}
                            onCellClick={handleCellClick}
                            cellIdentifier={(cat: string) => ({ type: 'week', week: weekStart.isoWeek(), year: weekStart.year(), category: cat })}
                            displayMode={displayMode}
                            minVisibleHeight={minVisibleHeight}
                        />
                    </div>
                </div>
                {popover && <Popover {...popover} onClose={() => { setPopover(null); setSelectedCell(null); }} app={app} module={module} actionService={actionService} dateRange={dateRange} currentView={currentView} timerService={timerService} timers={timers} allThemes={allThemes} />}
            </div>
        );
    }

    if (currentView === '月') {
        // 月视图：显示月度汇总和该月所有周的柱状图
        const monthData = aggregateByMonth(items, filteredCategories, startDate, usePeriod);

        const monthWeeksData = getMonthWeeksData(items, filteredCategories, startDate, usePeriod);
        const monthStart = startDate.startOf('month');
        const monthEnd = startDate.endOf('month');
        const weeksMeta: { weekStart: dayjs.Dayjs; label: string }[] = [];
        let weekCursor = monthStart.startOf('isoWeek');

        while (weekCursor.isBefore(monthEnd) || weekCursor.isSame(monthEnd, 'week')) {
            const weekStart = weekCursor;
            const weekEnd = weekStart.endOf('isoWeek');
            weeksMeta.push({
                weekStart,
                label: `${weekStart.format('MM-DD')} ~ ${weekEnd.format('MM-DD')}`
            });
            weekCursor = weekCursor.add(1, 'week');
        }

        return (
            <div class="statistics-view">
                <TopControls />
                <div class="sv-timeline">
                    {/* 月度汇总 */}
                    <div class="sv-row">
                        <ChartBlock
                            data={monthData}
                            label={startDate.format('YYYY年MM月')}
                            categories={filteredCategories}
                            onCellClick={handleCellClick}
                            cellIdentifier={(cat: string) => ({ type: 'month', month: startDate.month() + 1, year: startDate.year(), category: cat })}
                            displayMode={displayMode}
                            minVisibleHeight={minVisibleHeight}
                        />
                    </div>
                    
                    {/* 月度周视图 */}
                    <div class="sv-row sv-row-month-weeks">
                        {monthWeeksData.map((data, index) => {
                            const meta = weeksMeta[index];
                            if (!meta) return null;
                            const { weekStart } = meta;
                            return (
                                <ChartBlock
                                    key={weekStart.format('YYYY-MM-DD')}
                                    data={data}
                                    label={`第${index + 1}周`}
                                    categories={filteredCategories}
                                    onCellClick={handleCellClick}
                                    cellIdentifier={(cat: string) => ({ type: 'week', week: weekStart.isoWeek(), year: weekStart.year(), category: cat })}
                                    isCompact={true}
                                    displayMode={displayMode}
                                    minVisibleHeight={minVisibleHeight}
                                />
                            );
                        })}
                    </div>
                </div>
                {popover && <Popover {...popover} onClose={() => { setPopover(null); setSelectedCell(null); }} app={app} module={module} actionService={actionService} dateRange={dateRange} currentView={currentView} timerService={timerService} timers={timers} allThemes={allThemes} />}
            </div>
        );
    }

    if (currentView === '季') {
        // 季度视图：显示季度汇总、3个月及其下属周
        const quarterStart = startDate.startOf('quarter');

        const quarterData = aggregateByQuarter(items, filteredCategories, startDate, usePeriod);

        const monthsData = Array.from({ length: 3 }, (_, i) => {
            const month = quarterStart.add(i, 'month');
            const monthData = aggregateByMonth(items, filteredCategories, month, usePeriod);
            const weeksData = getMonthWeeksData(items, filteredCategories, month, usePeriod);
            const monthStart = month.startOf('month');
            const monthEnd = month.endOf('month');
            const weeksMeta: { weekStart: dayjs.Dayjs }[] = [];
            let weekCursor = monthStart.startOf('isoWeek');

            while (weekCursor.isBefore(monthEnd) || weekCursor.isSame(monthEnd, 'week')) {
                const weekStart = weekCursor;
                weeksMeta.push({ weekStart });
                weekCursor = weekCursor.add(1, 'week');
            }

            return { month, data: monthData, weeksData, weeksMeta };
        });

        return (
            <div class="statistics-view">
                <TopControls />
                <div class="sv-timeline">
                    {/* 季度汇总 */}
                    <div class="sv-row">
                        <ChartBlock
                            data={quarterData}
                            label={`${startDate.format('YYYY年')} 第${startDate.quarter()}季度`}
                            categories={filteredCategories}
                            onCellClick={handleCellClick}
                            cellIdentifier={(cat: string) => ({ type: 'quarter', quarter: startDate.quarter(), year: startDate.year(), category: cat })}
                            displayMode={displayMode}
                            minVisibleHeight={minVisibleHeight}
                        />
                    </div>
                    
                    {/* 季度月份总览 */}
                    <div class="sv-row sv-row-quarter-months">
                        {monthsData.map(({ month, data }) => (
                            <ChartBlock
                                key={month.format('YYYY-MM')}
                                data={data}
                                label={month.format('MM月')}
                                categories={filteredCategories}
                                onCellClick={handleCellClick}
                                cellIdentifier={(cat: string) => ({ type: 'month', month: month.month() + 1, year: month.year(), category: cat })}
                                displayMode={displayMode}
                                minVisibleHeight={minVisibleHeight}
                            />
                        ))}
                    </div>
                    
                    {/* 每月的周视图 */}
                    {monthsData.map(({ month, weeksData, weeksMeta }) => (
                        <div key={month.format('YYYY-MM')} class="sv-month-weeks-section">
                            <div class="sv-month-header">
                                {month.format('YYYY年MM月')} 周视图
                            </div>
                            <div class="sv-row sv-row-month-weeks">
                                {weeksData.map((data, index) => {
                                    const meta = weeksMeta[index];
                                    if (!meta) return null;
                                    const { weekStart } = meta;
                                    return (
                                        <ChartBlock
                                            key={weekStart.format('YYYY-MM-DD')}
                                            data={data}
                                            label={`${weekStart.isoWeek()}W`}
                                            categories={filteredCategories}
                                            onCellClick={handleCellClick}
                                            cellIdentifier={(cat: string) => ({ type: 'week', week: weekStart.isoWeek(), year: weekStart.year(), category: cat })}
                                            isCompact={true}
                                            displayMode={displayMode}
                                            minVisibleHeight={minVisibleHeight}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            {popover && <Popover {...popover} onClose={() => { setPopover(null); setSelectedCell(null); }} app={app} module={module} actionService={actionService} dateRange={dateRange} currentView={currentView} timerService={timerService} timers={timers} allThemes={allThemes} />}
        </div>
    );
}

    // 年视图：保持原有的层级结构
    const year = startDate.year();
    const yearlyWeekStructure = useMemo(() => {
        const months: { month: number; weeks: number[] }[] = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            weeks: [],
        }));
        const totalWeeks = getWeeksInYear(year);

        for (let week = 1; week <= totalWeeks; week++) {
            const thursdayOfWeek = dayjs().year(year).isoWeek(week).day(4);
            const monthIndex = thursdayOfWeek.month();
            if (months[monthIndex]) {
                months[monthIndex].weeks.push(week);
            }
        }
        return months;
    }, [year]);

    const processedData = useMemo(() => {
        const totalWeeks = getWeeksInYear(year);
        const targetDate = dayjs().year(year);
        const yearData = aggregateByYear(items, filteredCategories, targetDate, usePeriod);

        const quartersData: PeriodData[] = [];
        for (let q = 1; q <= 4; q++) {
            const quarterDate = targetDate.quarter(q);
            quartersData.push(aggregateByQuarter(items, filteredCategories, quarterDate, usePeriod));
        }

        const monthsData: PeriodData[] = [];
        for (let m = 0; m < 12; m++) {
            const monthDate = targetDate.month(m);
            monthsData.push(aggregateByMonth(items, filteredCategories, monthDate, usePeriod));
        }

        const weeksData: PeriodData[] = [];
        for (let w = 1; w <= totalWeeks; w++) {
            const weekDate = targetDate.isoWeek(w);
            weeksData.push(aggregateByWeek(items, filteredCategories, weekDate));
        }

        return { yearData, quartersData, monthsData, weeksData };
    }, [items, year, filteredCategories, usePeriod]);

    return (
        <div class="statistics-view">
            <TopControls />
            <div class="sv-timeline">
                <div class="sv-row"><ChartBlock data={processedData.yearData} label={`${year}年`} categories={filteredCategories} onCellClick={handleCellClick} cellIdentifier={(cat:string) => ({type:'year', year, category:cat})} displayMode={displayMode} minVisibleHeight={minVisibleHeight} /></div>
                <div class="sv-row sv-row-quarters">{processedData.quartersData.map((data, i) => (<ChartBlock key={i} data={data} label={`Q${i+1}`} categories={filteredCategories} onCellClick={handleCellClick} cellIdentifier={(cat:string) => ({type:'quarter', year, quarter:i+1, category:cat})} displayMode={displayMode} minVisibleHeight={minVisibleHeight} />))}</div>
                <div class="sv-row sv-row-months">{processedData.monthsData.map((data, i) => (<ChartBlock key={i} data={data} label={`${i+1}月`} categories={filteredCategories} onCellClick={handleCellClick} cellIdentifier={(cat:string) => ({type:'month', year, month:i+1, category:cat})} displayMode={displayMode} minVisibleHeight={minVisibleHeight} />))}</div>
                
                <div class="sv-row-weeks">
                    {yearlyWeekStructure.map(({ month, weeks }) => (
                        <div class="sv-month-col" key={month}>
                            <div class="sv-month-col-header">{month}月</div>
                            <div class="sv-month-col-weeks">
                                {weeks.map(week => {
                                    const weekIndex = week - 1;
                                    const weekData = processedData.weeksData[weekIndex] || createPeriodData(filteredCategories);
                                    return (
                                        <ChartBlock 
                                            key={week} 
                                            data={weekData} 
                                            label={`${week}W`} 
                                            categories={filteredCategories} 
                                            onCellClick={handleCellClick} 
                                            cellIdentifier={(cat:string) => ({type:'week', year, week, category:cat})} 
                                            isCompact={true} 
                                            displayMode={displayMode} 
                                            minVisibleHeight={minVisibleHeight}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {popover && <Popover {...popover} onClose={() => { setPopover(null); setSelectedCell(null); }} app={app} module={module} dateRange={dateRange} currentView={currentView} timerService={timerService} timers={timers} allThemes={allThemes} />}
        </div>
    );
}
