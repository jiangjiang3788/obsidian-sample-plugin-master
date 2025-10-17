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
                        fields={module.fields || ['title', 'content', 'categoryKey', 'tags', 'date']} 
                        groupField={module.group} 
                        onMarkDone={() => {}} 
                    />
                }
            </div>
        </div>
    );
};


// =============== 图表子组件 ===============
const ChartBlock = ({ data, label, onCellClick, categories, cellIdentifier, isCompact = false, scaleFactor = 1 }: any) => {
    const counts = data.counts as Record<string, number>;
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    
    // 计算缩放后的最大值用于高度计算
    let maxScaledCount = 1;
    categories.forEach(({name, scaleFactor: catScale}: {name: string, scaleFactor?: number}) => {
        const count = counts[name] || 0;
        const scaledCount = count * (catScale || 1.0);
        if (scaledCount > maxScaledCount) {
            maxScaledCount = scaledCount;
        }
    });

    const containerClasses = `sv-chart-block ${isCompact ? 'is-compact' : ''} ${total === 0 ? 'is-empty' : ''}`;

    return (
        <div class={containerClasses} onClick={(e) => onCellClick(cellIdentifier('全部'), e.currentTarget, data.blocks, `${label} · 全部`)}>
            <div class="sv-chart-label">{label}</div>
            <div class="sv-chart-bars-container">
                {categories.map(({name, color, alias, scaleFactor: catScale}: {name: string, color: string, alias?: string, scaleFactor?: number}) => {
                    const count = counts[name] || 0;
                    const scale = catScale || 1.0;
                    const scaledCount = count * scale;
                    const height = (scaledCount / maxScaledCount) * 100;
                    const displayName = alias || name;
                    
                    return (
                         <div key={name} class="sv-vbar-wrapper" title={`${name}: ${count} (×${scale.toFixed(1)})`}
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                onCellClick(cellIdentifier(name), e.currentTarget, data.blocks.filter((b:Item) => (b.categoryKey || '').startsWith(name)), `${label} · ${displayName}`); 
                            }}>
                            <div class="sv-vbar-bar-label">{count > 0 ? count : ''}</div>
                            <div class="sv-vbar-bar" style={{ height: `${height}%`, background: color || '#ccc' }}/>
                            <div class="sv-vbar-category-label" title={`${name}${alias ? ` (${name})` : ''}`}>{displayName}</div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
};


// =============== 主视图组件 ===============
export function StatisticsView({ items, app, dateRange, module, currentView }: StatisticsViewProps) {
    const { categories = [] } = { ...DEFAULT_CONFIG, ...module.viewConfig };
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
    if (currentView === '周') {
        // 周视图：显示一周7天的柱状图
        const weekStart = startDate.startOf('isoWeek');
        const daysData = Array.from({ length: 7 }, (_, i) => {
            const day = weekStart.add(i, 'day');
            const dayItems = items.filter(item => dayjs(item.date).isSame(day, 'day'));
            const data = processDataForItems(dayItems, '天');
            return { day, data };
        });

        return (
            <div class="statistics-view">
                <div class="sv-timeline">
                    <div class="sv-row sv-row-week-days" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                        {daysData.map(({ day, data }) => (
                            <ChartBlock
                                key={day.format('YYYY-MM-DD')}
                                data={data}
                                label={day.format('MM-DD ddd')}
                                categories={categories}
                                onCellClick={handleCellClick}
                                cellIdentifier={(cat: string) => ({ type: 'day', date: day.format('YYYY-MM-DD'), category: cat })}
                            />
                        ))}
                    </div>
                </div>
                {popover && <Popover {...popover} onClose={() => { setPopover(null); setSelectedCell(null); }} app={app} module={module} />}
            </div>
        );
    }

    if (currentView === '月') {
        // 月视图：显示该月所有周的柱状图
        const monthStart = startDate.startOf('month');
        const monthEnd = startDate.endOf('month');
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
                    <div class="sv-row sv-row-month-weeks" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(weeksData.length, 6)}, 1fr)`, gap: '8px' }}>
                        {weeksData.map(({ weekStart, data, label }, index) => (
                            <ChartBlock
                                key={weekStart.format('YYYY-MM-DD')}
                                data={data}
                                label={`第${index + 1}周`}
                                categories={categories}
                                onCellClick={handleCellClick}
                                cellIdentifier={(cat: string) => ({ type: 'week', week: weekStart.isoWeek(), year: weekStart.year(), category: cat })}
                            />
                        ))}
                    </div>
                </div>
                {popover && <Popover {...popover} onClose={() => { setPopover(null); setSelectedCell(null); }} app={app} module={module} />}
            </div>
        );
    }

    if (currentView === '季') {
        // 季度视图：显示3个月及其下属周
        const quarterStart = startDate.startOf('quarter');
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
                    {/* 季度总览 */}
                    <div class="sv-row sv-row-quarter-months" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                        {monthsData.map(({ month, data }) => (
                            <ChartBlock
                                key={month.format('YYYY-MM')}
                                data={data}
                                label={month.format('MM月')}
                                categories={categories}
                                onCellClick={handleCellClick}
                                cellIdentifier={(cat: string) => ({ type: 'month', month: month.month() + 1, year: month.year(), category: cat })}
                            />
                        ))}
                    </div>
                    
                    {/* 每月的周视图 */}
                    {monthsData.map(({ month, weeksData }) => (
                        <div key={month.format('YYYY-MM')} class="sv-month-weeks-section" style={{ marginTop: '16px' }}>
                            <div class="sv-month-header" style={{ fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>
                                {month.format('YYYY年MM月')} 周视图
                            </div>
                            <div class="sv-row sv-row-weeks" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(weeksData.length, 6)}, 1fr)`, gap: '6px' }}>
                                {weeksData.map(({ weekStart, data }) => (
                                    <ChartBlock
                                        key={weekStart.format('YYYY-MM-DD')}
                                        data={data}
                                        label={`${weekStart.isoWeek()}W`}
                                        categories={categories}
                                        onCellClick={handleCellClick}
                                        cellIdentifier={(cat: string) => ({ type: 'week', week: weekStart.isoWeek(), year: weekStart.year(), category: cat })}
                                        isCompact={true}
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

            if (itemPeriod === '年') { yearData.counts[baseCategory]++; yearData.blocks.push(item); }
            if (itemPeriod === '季') { const qIndex = itemDate.quarter() - 1; if (quartersData[qIndex]) { quartersData[qIndex].counts[baseCategory]++; quartersData[qIndex].blocks.push(item); }}
            if (itemPeriod === '月') { const mIndex = itemDate.month(); if (monthsData[mIndex]) { monthsData[mIndex].counts[baseCategory]++; monthsData[mIndex].blocks.push(item); }}

            const wIndex = itemDate.isoWeek() - 1;
            if (wIndex >= 0 && wIndex < totalWeeks) { if (weeksData[wIndex]) { weeksData[wIndex].counts[baseCategory]++; weeksData[wIndex].blocks.push(item); }}
        }
        
        return { yearData, quartersData, monthsData, weeksData };
    }, [items, year, categoryOrder]);

    return (
        <div class="statistics-view">
            <div class="sv-timeline">
                <div class="sv-row"><ChartBlock data={processedData.yearData} label={`${year}年`} categories={categories} onCellClick={handleCellClick} cellIdentifier={(cat:string) => ({type:'year', year, category:cat})} /></div>
                <div class="sv-row sv-row-quarters">{processedData.quartersData.map((data, i) => (<ChartBlock key={i} data={data} label={`Q${i+1}`} categories={categories} onCellClick={handleCellClick} cellIdentifier={(cat:string) => ({type:'quarter', year, quarter:i+1, category:cat})} />))}</div>
                <div class="sv-row sv-row-months">{processedData.monthsData.map((data, i) => (<ChartBlock key={i} data={data} label={`${i+1}月`} categories={categories} onCellClick={handleCellClick} cellIdentifier={(cat:string) => ({type:'month', year, month:i+1, category:cat})} />))}</div>
                
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
