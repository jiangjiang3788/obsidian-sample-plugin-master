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
                <Tooltip title="快捷创建 (功能待实现)">
                    <IconButton size="small" onClick={() => console.log("快捷创建功能待实现", title)}>
                        <AddCircleOutlineIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </div>
            <div className="sv-popover-content">
                {blocks.length === 0 ? <div class="sv-popover-empty">无内容</div> :
                    <BlockView items={blocks} app={app} fields={module.fields} groupField={module.group} />
                }
            </div>
        </div>
    );
};


// =============== 图表子组件 ===============
const ChartBlock = ({ data, label, onCellClick, categories, cellIdentifier, isCompact = false }: any) => {
    const total = Object.values(data.counts).reduce((sum: number, count: number) => sum + count, 0);
    const maxCount = Math.max(...Object.values(data.counts) as number[], 1);

    const containerClasses = `sv-chart-block ${isCompact ? 'is-compact' : ''} ${total === 0 ? 'is-empty' : ''}`;

    return (
        <div class={containerClasses} onClick={(e) => onCellClick(cellIdentifier('全部'), e.currentTarget, data.blocks, `${label} · 全部`)}>
            <div class="sv-chart-label">{label}</div>
            <div class="sv-chart-bars-container">
                {categories.map(({name, color}: {name: string, color: string}) => {
                    const count = data.counts[name] || 0;
                    const height = (count / maxCount) * 100;
                    return (
                         <div key={name} class="sv-vbar-wrapper" title={`${name}: ${count}`}
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                onCellClick(cellIdentifier(name), e.currentTarget, data.blocks.filter((b:Item) => (b.categoryKey || '').startsWith(name)), `${label} · ${name}`); 
                            }}>
                            <div class="sv-vbar-bar-label">{count > 0 ? count : ''}</div>
                            <div class="sv-vbar-bar" style={{ height: `${height}%`, background: color || '#ccc' }}/>
                        </div>
                    )
                })}
            </div>
        </div>
    )
};


// =============== 主视图组件 ===============
export function StatisticsView({ items, app, dateRange, module }: StatisticsViewProps) {
    const { categories = [] } = { ...DEFAULT_CONFIG, ...module.viewConfig };
    const categoryOrder = useMemo(() => categories.map((c: any) => c.name), [categories]);
    const [selectedCell, setSelectedCell] = useState<any>(null);
    const [popover, setPopover] = useState<PopoverState | null>(null);
    const year = useMemo(() => dayjs(dateRange[0]).year(), [dateRange]);

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

    const createPeriodData = (): PeriodData => ({
        counts: Object.fromEntries(categoryOrder.map(c => [c, 0])),
        blocks: [],
    });

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

    const handleCellClick = (cellIdentifier: any, target: HTMLElement, blocks: Item[], title: string) => {
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