// src/features/dashboard/ui/StatisticsView.tsx
/** @jsxImportSource preact */
import { h, Fragment } from 'preact';
import { useState, useMemo, useEffect, useRef } from 'preact/hooks';
import { Item, readField } from '@core/domain/schema';
import { dayjs, getWeeksInYear, getWeeksOfMonth } from '@core/utils/date';
import { App } from 'obsidian';
import { DEFAULT_CONFIG } from '../settings/ModuleEditors/StatisticsViewEditor';
import { makeObsUri } from '@core/utils/obsidian';

// =============== 类型定义 ===============
interface StatisticsViewProps {
    items: Item[];
    app: App;
    dateRange: [Date, Date]; // 从 LayoutRenderer 继承时间范围
    categoryOrder?: string[];
    categoryColors?: Record<string, string>;
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
const Popover = ({ target, blocks, title, onClose, app, categoryColors }: PopoverState & { onClose: () => void, app: App, categoryColors: Record<string, string> }) => {
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
            <div className="sv-popover-title">{title}</div>
            <div className="sv-popover-content">
                {blocks.length === 0 ? <div class="sv-popover-empty">无内容</div> :
                    blocks.map(block => {
                        const baseCategory = (block.categoryKey || '').split('/')[0];
                        const color = categoryColors[baseCategory] || '#e0e0e0';
                        return (
                            <div key={block.id} class="sv-popover-item" style={{ background: `${color}40` }}>
                                 <a href={makeObsUri(block)} className="sv-popover-link" target="_blank" rel="noopener">
                                     {block.icon && <span>{block.icon} </span>}
                                     {block.content || block.title}
                                 </a>
                            </div>
                        );
                    })
                }
            </div>
        </div>
    );
};

// =============== 图表子组件 ===============
const BarChartBlock = ({ data, label, onCellClick, categoryOrder, categoryColors, cellIdentifier }: any) => {
    const total = Object.values(data.counts).reduce((sum: number, count: number) => sum + count, 0);
    
    return (
        <div class={`sv-bar-chart ${total === 0 ? 'is-empty' : ''}`} onClick={(e) => total > 0 && onCellClick(cellIdentifier('全部'), e.currentTarget, data.blocks, `${label} · 全部`)}>
            <div class="sv-bar-chart-label">{label}</div>
            {total > 0 && (
                <div class="sv-bar-chart-container">
                    {categoryOrder.map((cat: string) => {
                        const count = data.counts[cat] || 0;
                        if (count === 0) return null;
                        const percentage = (count / total) * 100;
                        return (
                            <div
                                key={cat}
                                class="sv-bar-segment"
                                style={{ width: `${percentage}%`, background: categoryColors[cat] || '#ccc' }}
                                title={`${cat}: ${count}`}
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    onCellClick(cellIdentifier(cat), e.currentTarget, data.blocks.filter((b:Item) => (b.categoryKey || '').startsWith(cat)), `${label} · ${cat}`); 
                                }}
                            >
                               <span class="sv-bar-segment-number">{count}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// =============== 主视图组件 ===============
export function StatisticsView({ items, app, dateRange, ...config }: StatisticsViewProps) {
    const { categoryOrder, categoryColors } = { ...DEFAULT_CONFIG, ...config };
    const [selectedCell, setSelectedCell] = useState<any>(null);
    const [popover, setPopover] = useState<PopoverState | null>(null);

    const year = useMemo(() => dayjs(dateRange[0]).year(), [dateRange]);

    const processedData = useMemo(() => {
        const createPeriodData = (): PeriodData => ({
            counts: Object.fromEntries(categoryOrder.map(c => [c, 0])),
            blocks: [],
        });

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

            if (itemPeriod === '年') {
                yearData.counts[baseCategory]++;
                yearData.blocks.push(item);
            }
            if (itemPeriod === '季') {
                const qIndex = itemDate.quarter() - 1;
                if (quartersData[qIndex]) {
                    quartersData[qIndex].counts[baseCategory]++;
                    quartersData[qIndex].blocks.push(item);
                }
            }
            if (itemPeriod === '月') {
                const mIndex = itemDate.month();
                if (monthsData[mIndex]) {
                    monthsData[mIndex].counts[baseCategory]++;
                    monthsData[mIndex].blocks.push(item);
                }
            }

            const wIndex = itemDate.isoWeek() - 1;
            if (wIndex >= 0 && wIndex < totalWeeks) {
                weeksData[wIndex].counts[baseCategory]++;
                weeksData[wIndex].blocks.push(item);
            }
        }
        
        return { yearData, quartersData, monthsData, weeksData };

    }, [items, year, categoryOrder]);

    const handleCellClick = (cellIdentifier: any, target: HTMLElement, blocks: Item[], title: string) => {
        setSelectedCell(cellIdentifier);
        setPopover({ target, blocks, title });
    };

    return (
        <div class="statistics-view">
            <div class="sv-timeline">
                <div class="sv-row">
                    <BarChartBlock data={processedData.yearData} label={`${year}年`} categoryOrder={categoryOrder} categoryColors={categoryColors} onCellClick={handleCellClick} cellIdentifier={(cat:string) => ({type:'year', year, category:cat})} />
                </div>
                <div class="sv-row">
                    {processedData.quartersData.map((data, i) => (
                        <BarChartBlock key={i} data={data} label={`Q${i+1}`} categoryOrder={categoryOrder} categoryColors={categoryColors} onCellClick={handleCellClick} cellIdentifier={(cat:string) => ({type:'quarter', year, quarter:i+1, category:cat})} />
                    ))}
                </div>
                 <div class="sv-row">
                    {processedData.monthsData.map((data, i) => (
                        <BarChartBlock key={i} data={data} label={`${i+1}月`} categoryOrder={categoryOrder} categoryColors={categoryColors} onCellClick={handleCellClick} cellIdentifier={(cat:string) => ({type:'month', year, month:i+1, category:cat})} />
                    ))}
                </div>
                 <div class="sv-row-weeks">
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                        <div class="sv-month-col" key={m}>
                            {getWeeksOfMonth(year, m).map(({week}) => {
                                const weekIndex = week - 1;
                                // 健壮性检查，防止数组越界
                                const weekData = processedData.weeksData[weekIndex] || { counts: {}, blocks: [] };
                                return (
                                    <BarChartBlock key={week} data={weekData} label={`${week}W`} categoryOrder={categoryOrder} categoryColors={categoryColors} onCellClick={handleCellClick} cellIdentifier={(cat:string) => ({type:'week', year, week, category:cat})} />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
            
            {popover && <Popover {...popover} onClose={() => setPopover(null)} app={app} categoryColors={categoryColors} />}
        </div>
    );
}