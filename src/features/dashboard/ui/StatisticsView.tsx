// src/features/dashboard/ui/StatisticsView.tsx
/** @jsxImportSource preact */
import { h, Fragment } from 'preact';
import { useState, useMemo, useEffect, useRef } from 'preact/hooks';
import { Item, readField, ViewInstance } from '@core/domain/schema';
import { dayjs, getWeeksInYear } from '@core/utils/date';
import { App } from 'obsidian';
// [最终修正] 使用别名路径，代码更清晰且稳定
import { DEFAULT_CONFIG } from '@features/settings/ui/components/view-editors/StatisticsViewEditor';
import { BlockView } from './BlockView';
import { IconButton, Tooltip } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

// ... 文件剩余部分代码保持不变 ...
// =============== 类型定义 ===============
interface StatisticsViewProps {
    items: Item[];
    app: App;
    dateRange: [Date, Date];
    module: ViewInstance;
    currentView: '年' | '季' | '月' | '周' | '天';
    useFieldGranularity?: boolean;
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
const Popover = ({ target, blocks, title, onClose, app, module }: PopoverState & { onClose: () => void, app: App, module: ViewInstance }) => {
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 50);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const rect = target.getBoundingClientRect();
    let left = rect.left + rect.width / 2;
    let top = rect.bottom + 8;
    const style = {
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        transform: 'translateX(-50%)',
        zIndex: 99999,
    };

    return (
        <div ref={popoverRef} style={style} className="sv-popover">
            <div className="sv-popover-title">
                <span>{title}</span>
                <button 
                    title="快捷创建 (功能待实现)"
                    onClick={() => console.log("快捷创建功能待实现", title)}
                    style={{ 
                        border: 'none', 
                        background: 'transparent', 
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px'
                    }}
                >
                    +
                </button>
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
export function StatisticsView({ items, app, dateRange, module, currentView, useFieldGranularity = false }: StatisticsViewProps) {
    const { categories = [], displayMode = 'smart', minVisibleHeight = 15 } = { ...DEFAULT_CONFIG, ...module.viewConfig };
    const categoryOrder = useMemo(() => categories.map((c: any) => c.name), [categories]);
    const [selectedCell, setSelectedCell] = useState<any>(null);
    const [popover, setPopover] = useState<PopoverState | null>(null);
    
    const startDate = useMemo(() => dayjs(dateRange[0]), [dateRange]);
    const endDate = useMemo(() => dayjs(dateRange[1]), [dateRange]);

    const createPeriodData = (): PeriodData => ({
        counts: Object.fromEntries(categoryOrder.map(c => [c, 0])),
        blocks: [],
    });

    // 处理所有数据的基础函数 - 修复：周视图应显示所有数据，不按period过滤
    const processDataForItems = (itemList: Item[], period?: string) => {
        const data = createPeriodData();
        itemList.forEach(item => {
            const itemDate = dayjs(item.date);
            if (!itemDate.isValid()) return;
            
            const baseCategory = (item.categoryKey || '').split('/')[0];
            if (!categoryOrder.includes(baseCategory)) return;
            
            // 如果是专属视图（周、月、季），直接统计所有数据
            // 如果是年视图，仍然按period过滤
            if (!period || currentView !== '年') {
                data.counts[baseCategory]++;
                data.blocks.push(item);
            } else {
                // 年视图保持原有逻辑
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
                            categories={categories}
                            onCellClick={handleCellClick}
                            cellIdentifier={(cat: string) => ({ type: 'day', date: selectedDate.format('YYYY-MM-DD'), category: cat })}
                            displayMode={displayMode}
                            minVisibleHeight={minVisibleHeight}
                        />
                    </div>
                </div>
                {popover && <Popover {...popover} onClose={() => { setPopover(null); setSelectedCell(null); }} app={app} module={module} />}
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
                            categories={categories}
                            onCellClick={handleCellClick}
                            cellIdentifier={(cat: string) => ({ type: 'week', week: weekStart.isoWeek(), year: weekStart.year(), category: cat })}
                            displayMode={displayMode}
                            minVisibleHeight={minVisibleHeight}
                        />
                    </div>
                </div>
                {popover && <Popover {...popover} onClose={() => { setPopover(null); setSelectedCell(null); }} app={app} module={module} />}
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
        const monthData = processDataForItems(monthItems);
        
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
                <div class="sv-timeline">
                    {/* 月度汇总 */}
                    <div class="sv-row">
                        <ChartBlock
                            data={monthData}
                            label={startDate.format('YYYY年MM月')}
                            categories={categories}
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
                                categories={categories}
                                onCellClick={handleCellClick}
                                cellIdentifier={(cat: string) => ({ type: 'week', week: weekStart.isoWeek(), year: weekStart.year(), category: cat })}
                                isCompact={true}
                                displayMode={displayMode}
                                minVisibleHeight={minVisibleHeight}
                            />
                        ))}
                    </div>
                </div>
                {popover && <Popover {...popover} onClose={() => { setPopover(null); setSelectedCell(null); }} app={app} module={module} />}
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
        const quarterData = processDataForItems(quarterItems);
        
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
                <div class="sv-timeline">
                    {/* 季度汇总 */}
                    <div class="sv-row">
                        <ChartBlock
                            data={quarterData}
                            label={`${startDate.format('YYYY年')} 第${startDate.quarter()}季度`}
                            categories={categories}
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
                                categories={categories}
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
                                        categories={categories}
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
                {popover && <Popover {...popover} onClose={() => { setPopover(null); setSelectedCell(null); }} app={app} module={module} />}
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

            if (useFieldGranularity) {
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
    }, [items, year, categoryOrder, useFieldGranularity]);

    return (
        <div class="statistics-view">
            <div class="sv-timeline">
                <div class="sv-row"><ChartBlock data={processedData.yearData} label={`${year}年`} categories={categories} onCellClick={handleCellClick} cellIdentifier={(cat:string) => ({type:'year', year, category:cat})} displayMode={displayMode} minVisibleHeight={minVisibleHeight} /></div>
                <div class="sv-row sv-row-quarters">{processedData.quartersData.map((data, i) => (<ChartBlock key={i} data={data} label={`Q${i+1}`} categories={categories} onCellClick={handleCellClick} cellIdentifier={(cat:string) => ({type:'quarter', year, quarter:i+1, category:cat})} displayMode={displayMode} minVisibleHeight={minVisibleHeight} />))}</div>
                <div class="sv-row sv-row-months">{processedData.monthsData.map((data, i) => (<ChartBlock key={i} data={data} label={`${i+1}月`} categories={categories} onCellClick={handleCellClick} cellIdentifier={(cat:string) => ({type:'month', year, month:i+1, category:cat})} displayMode={displayMode} minVisibleHeight={minVisibleHeight} />))}</div>
                
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
                                            categories={categories} 
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
            
            {popover && <Popover {...popover} onClose={() => { setPopover(null); setSelectedCell(null); }} app={app} module={module} />}
        </div>
    );
}
