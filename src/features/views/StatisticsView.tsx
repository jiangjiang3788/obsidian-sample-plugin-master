// src/features/dashboard/ui/StatisticsView.tsx
/** @jsxImportSource preact */
import { h, Fragment } from 'preact';
import { useState, useMemo, useEffect, useRef } from 'preact/hooks';
import { Item, readField, ViewInstance } from '@core/types/domain/schema';
import { dayjs, getWeeksInYear } from '@core/utils/date';
import { App, Notice } from 'obsidian';
// [架构标准化] 从core配置导入，避免features间依赖违规
import { STATISTICS_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '../../core/config/viewConfigs';
import { BlockView } from './BlockView';
import { IconButton, Tooltip } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import IosShareIcon from '@mui/icons-material/IosShare';
import { exportItemsToMarkdown } from '@core/utils/exportUtils';
import { QuickInputModal } from '@features/quickinput/ui/QuickInputModal';
import { dayjs as dayjsUtil } from '@core/utils/date';
// [新增] 统一数据聚合支持
import { aggregateItems, generateStatisticsData, AggregatedData } from '@core/utils/dataAggregation';

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
}
interface PeriodData {
    counts: Record<string, number>;
    blocks: Item[];
}
interface PopoverState {
    target: HTMLElement;
    blocks: Item[];
    title: string;
}

// =============== 悬浮窗组件 ===============
const Popover = ({ target, blocks, title, onClose, app, module, actionService, dateRange, currentView }: PopoverState & { 
    onClose: () => void; 
    app: App; 
    module: ViewInstance;
    actionService?: any;
    dateRange: [Date, Date];
    currentView: string;
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
        position: 'fixed',
        top: `${position.y}px`,
        left: `${position.x}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: 99999,
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
            <div className="sv-popover-title" style={{ cursor: 'grab' }}>
                <span>{title}</span>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
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
                    />
                }
            </div>
        </div>
    );
};


// =============== 图表子组件 ===============
const ChartBlock = ({ data, label, onCellClick, categories, cellIdentifier, isCompact = false, displayMode = 'smart', minVisibleHeight = 15 }: any) => {
    const counts = data.counts as Record<string, number>;
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    
    // 智能高度计算算法
    const calculateHeight = (count: number) => {
        if (count === 0) return 0;
        
        // 收集所有非零数值
        const nonZeroCounts: number[] = [];
        categories.forEach(({name}: {name: string}) => {
            const c = counts[name] || 0;
            if (c > 0) {
                nonZeroCounts.push(c);
            }
        });
        
        if (nonZeroCounts.length === 0) return 0;
        
        const maxCount = Math.max(...nonZeroCounts);
        const minCount = Math.min(...nonZeroCounts);
        const ratio = maxCount / Math.max(minCount, 1);
        
        let height = 0;
        
        switch (displayMode) {
            case 'logarithmic':
                // 对数模式：使用对数缩放
                height = (Math.log(count + 1) / Math.log(maxCount + 1)) * 100;
                break;
                
            case 'linear':
                // 线性模式：严格按比例
                height = (count / maxCount) * 100;
                break;
                
            case 'smart':
            default:
                // 智能模式：根据数据分布自动选择
                if (ratio > 10) {
                    // 数据差异很大时，使用混合算法
                    const logHeight = (Math.log(count + 1) / Math.log(maxCount + 1)) * 100;
                    const linearHeight = (count / maxCount) * 100;
                    // 按比例混合对数和线性高度
                    const logWeight = Math.min(ratio / 20, 0.7); // 最大70%对数权重
                    height = logHeight * logWeight + linearHeight * (1 - logWeight);
                } else {
                    // 数据差异不大时，使用线性模式
                    height = (count / maxCount) * 100;
                }
                break;
        }
        
        // 确保最小可见高度
        if (height > 0 && height < minVisibleHeight) {
            height = minVisibleHeight;
        }
        
        return Math.min(height, 100);
    };

    const containerClasses = `sv-chart-block ${isCompact ? 'is-compact' : ''} ${total === 0 ? 'is-empty' : ''}`;

    return (
        <div class={containerClasses} onClick={(e) => onCellClick(cellIdentifier('全部'), e.currentTarget, data.blocks, `${label} · 全部`)}>
            <div class="sv-chart-label">{label}</div>
            <div class="sv-chart-content">
                <div class="sv-chart-numbers">
                    {categories.map(({name}: {name: string}) => {
                        const count = counts[name] || 0;
                        return (
                            <div key={`num-${name}`} class="sv-chart-number">
                                {count > 0 ? count : ''}
                            </div>
                        );
                    })}
                </div>
                <div class="sv-chart-bars-container">
                    {categories.map(({name, color, alias}: {name: string, color: string, alias?: string}) => {
                        const count = counts[name] || 0;
                        const height = calculateHeight(count);
                        const displayName = alias || name;
                        
                        return (
                            <div key={name} class="sv-vbar-wrapper" title={`${name}: ${count}`}
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    onCellClick(cellIdentifier(name), e.currentTarget, data.blocks.filter((b:Item) => (b.categoryKey || '').startsWith(name)), `${label} · ${displayName}`); 
                                }}>
                                <div class="sv-vbar-bar" style={{ height: `${height}%`, background: color || '#ccc' }}/>
                            </div>
                        );
                    })}
                </div>
                <div class="sv-chart-categories">
                    {categories.map(({name, alias}: {name: string, alias?: string}) => {
                        const displayName = alias || name;
                        return (
                            <div key={`cat-${name}`} class="sv-chart-category" title={`${name}${alias ? ` (${name})` : ''}`}>
                                {displayName}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    )
};


// =============== 主视图组件 ===============
export function StatisticsView({ items, app, dateRange, module, currentView, useFieldGranularity = false, actionService, selectedCategories }: StatisticsViewProps) {
    const { categories = [], displayMode = 'smart', minVisibleHeight = 15, usePeriodField = false } = { ...DEFAULT_CONFIG, ...module.viewConfig };
    const categoryOrder = useMemo(() => categories.map((c: any) => c.name), [categories]);
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
            return categories;
        }
        return categories.filter((c: any) => selectedCategories.includes(c.name));
    }, [categories, selectedCategories]);

    const createPeriodData = (): PeriodData => ({
        counts: Object.fromEntries(filteredCategories.map((c: any) => [c.name, 0])),
        blocks: [],
    });

    // 处理所有数据的基础函数 - 支持年、季度、月视图的周期字段功能
    const processDataForItems = (itemList: Item[], period?: string) => {
        const data = createPeriodData();
        itemList.forEach(item => {
            const itemDate = dayjs(item.date);
            if (!itemDate.isValid()) return;
            
            const baseCategory = (item.categoryKey || '').split('/')[0];
            if (!categoryOrder.includes(baseCategory)) return;
            
            // 如果没有指定period或不使用周期字段，直接统计所有数据
            if (!period || !usePeriod || (currentView !== '年' && currentView !== '季' && currentView !== '月')) {
                data.counts[baseCategory]++;
                data.blocks.push(item);
            } else {
                // 年、季度、月视图且开启周期字段时，按period过滤
                const itemPeriod = readField(item, 'period') || '';
                if (itemPeriod === period) {
                    data.counts[baseCategory]++;
                    data.blocks.push(item);
                }
            }
        });
        return data;
    };

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
        const dayItems = items.filter(item => dayjs(item.date).isSame(selectedDate, 'day'));
        const data = processDataForItems(dayItems);

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
                {popover && <Popover {...popover} onClose={() => { setPopover(null); setSelectedCell(null); }} app={app} module={module} actionService={actionService} dateRange={dateRange} currentView={currentView} />}
            </div>
        );
    }

    if (currentView === '周') {
        // 周视图：显示选定周的整体统计数据
        const weekStart = startDate.startOf('isoWeek');
        const weekEnd = startDate.endOf('isoWeek');
        const weekItems = items.filter(item => {
            const itemDate = dayjs(item.date);
            return itemDate.isBetween(weekStart, weekEnd, 'day', '[]');
        });
        const data = processDataForItems(weekItems);

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
                {popover && <Popover {...popover} onClose={() => { setPopover(null); setSelectedCell(null); }} app={app} module={module} actionService={actionService} dateRange={dateRange} currentView={currentView} />}
            </div>
        );
    }

    if (currentView === '月') {
        // 月视图：显示月度汇总和该月所有周的柱状图
        const monthStart = startDate.startOf('month');
        const monthEnd = startDate.endOf('month');
        
        // 月度汇总数据
        const monthItems = items.filter(item => {
            const itemDate = dayjs(item.date);
            return itemDate.isBetween(monthStart, monthEnd, 'day', '[]');
        });
        const monthData = processDataForItems(monthItems, '月');
        
        const weeksData = [];
        let weekStart = monthStart.startOf('isoWeek');
        while (weekStart.isBefore(monthEnd) || weekStart.isSame(monthEnd, 'week')) {
            const weekEnd = weekStart.endOf('isoWeek');
            const weekItems = items.filter(item => {
                const itemDate = dayjs(item.date);
                return itemDate.isBetween(weekStart, weekEnd, 'day', '[]');
            });
            const data = processDataForItems(weekItems, '周');
            weeksData.push({ 
                weekStart, 
                weekEnd, 
                data, 
                label: `${weekStart.format('MM-DD')} ~ ${weekEnd.format('MM-DD')}`
            });
            weekStart = weekStart.add(1, 'week');
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
                        {weeksData.map(({ weekStart, data, label }, index) => (
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
                        ))}
                    </div>
                </div>
                {popover && <Popover {...popover} onClose={() => { setPopover(null); setSelectedCell(null); }} app={app} module={module} actionService={actionService} dateRange={dateRange} currentView={currentView} />}
            </div>
        );
    }

    if (currentView === '季') {
        // 季度视图：显示季度汇总、3个月及其下属周
        const quarterStart = startDate.startOf('quarter');
        const quarterEnd = startDate.endOf('quarter');
        
        // 季度汇总数据
        const quarterItems = items.filter(item => {
            const itemDate = dayjs(item.date);
            return itemDate.isBetween(quarterStart, quarterEnd, 'day', '[]');
        });
        const quarterData = processDataForItems(quarterItems, '季');
        
        const monthsData = Array.from({ length: 3 }, (_, i) => {
            const month = quarterStart.add(i, 'month');
            const monthItems = items.filter(item => dayjs(item.date).isSame(month, 'month'));
            const data = processDataForItems(monthItems, '月');
            
            // 获取该月的周数据
            const monthStart = month.startOf('month');
            const monthEnd = month.endOf('month');
            const weeksData = [];
            let weekStart = monthStart.startOf('isoWeek');
            
            while (weekStart.isBefore(monthEnd) || weekStart.isSame(monthEnd, 'week')) {
                const weekEnd = weekStart.endOf('isoWeek');
                const weekItems = items.filter(item => {
                    const itemDate = dayjs(item.date);
                    return itemDate.isBetween(weekStart, weekEnd, 'day', '[]') && itemDate.isSame(month, 'month');
                });
                const weekData = processDataForItems(weekItems, '周');
                weeksData.push({ weekStart, data: weekData });
                weekStart = weekStart.add(1, 'week');
            }
            
            return { month, data, weeksData };
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
                    {monthsData.map(({ month, weeksData }) => (
                        <div key={month.format('YYYY-MM')} class="sv-month-weeks-section">
                            <div class="sv-month-header">
                                {month.format('YYYY年MM月')} 周视图
                            </div>
                            <div class="sv-row sv-row-month-weeks">
                                {weeksData.map(({ weekStart, data }) => (
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
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            {popover && <Popover {...popover} onClose={() => { setPopover(null); setSelectedCell(null); }} app={app} module={module} actionService={actionService} dateRange={dateRange} currentView={currentView} />}
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
        const yearData = createPeriodData();
        const quartersData = Array.from({ length: 4 }, createPeriodData);
        const monthsData = Array.from({ length: 12 }, createPeriodData);
        const weeksData = Array.from({ length: totalWeeks }, createPeriodData);

        for (const item of items) {
            const itemDate = dayjs(item.date);
            if (!itemDate.isValid() || itemDate.year() !== year) continue;
            const itemPeriod = readField(item, 'period') || '';
            const baseCategory = (item.categoryKey || '').split('/')[0];
            if (!categoryOrder.includes(baseCategory)) continue;

            if (usePeriod) {
                // 开关开启：使用字段粒度过滤（保持原有period门槛逻辑）
                if (itemPeriod === '年') { yearData.counts[baseCategory]++; yearData.blocks.push(item); }
                if (itemPeriod === '季') { const qIndex = itemDate.quarter() - 1; if (quartersData[qIndex]) { quartersData[qIndex].counts[baseCategory]++; quartersData[qIndex].blocks.push(item); }}
                if (itemPeriod === '月') { const mIndex = itemDate.month(); if (monthsData[mIndex]) { monthsData[mIndex].counts[baseCategory]++; monthsData[mIndex].blocks.push(item); }}
            } else {
                // 开关关闭：按日期归属统计（不看period字段，按时间窗口归属）
                // 年层：统计所有该年的条目
                yearData.counts[baseCategory]++;
                yearData.blocks.push(item);
                
                // 季层：按日期归属到对应季度
                const qIndex = itemDate.quarter() - 1;
                if (quartersData[qIndex]) { 
                    quartersData[qIndex].counts[baseCategory]++; 
                    quartersData[qIndex].blocks.push(item); 
                }
                
                // 月层：按日期归属到对应月份
                const mIndex = itemDate.month();
                if (monthsData[mIndex]) { 
                    monthsData[mIndex].counts[baseCategory]++; 
                    monthsData[mIndex].blocks.push(item); 
                }
            }

            // 周层：始终按日期归属统计（不受开关影响，与现有行为保持一致）
            const wIndex = itemDate.isoWeek() - 1;
            if (wIndex >= 0 && wIndex < totalWeeks) { 
                if (weeksData[wIndex]) { 
                    weeksData[wIndex].counts[baseCategory]++; 
                    weeksData[wIndex].blocks.push(item); 
                }
            }
        }
        
        return { yearData, quartersData, monthsData, weeksData };
    }, [items, year, categoryOrder, usePeriod]);

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
                                    const weekData = processedData.weeksData[weekIndex] || createPeriodData();
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
            
            {popover && <Popover {...popover} onClose={() => { setPopover(null); setSelectedCell(null); }} app={app} module={module} dateRange={dateRange} currentView={currentView} />}
        </div>
    );
}
