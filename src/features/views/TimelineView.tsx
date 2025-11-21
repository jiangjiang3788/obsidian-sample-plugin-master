// src/features/dashboard/ui/TimelineView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useCallback, useState, useEffect, useRef } from 'preact/hooks';
import { Item } from '@/core/types/schema';
import { makeObsUri } from '@core/utils/obsidian';
import { processItemsToTimelineTasks, splitTaskIntoDayBlocks, TaskBlock } from './timeline-parser';
import { dayjs, minutesToTime } from '@core/utils/date';
import weekOfYear from 'dayjs/esm/plugin/weekOfYear';
import isoWeek from 'dayjs/esm/plugin/isoWeek';
import isBetween from 'dayjs/esm/plugin/isBetween';
import { DEFAULT_CONFIG as DEFAULT_TIMELINE_CONFIG } from '@features/settings/TimelineViewEditor';
import { App, Notice } from 'obsidian';
import { ItemService } from '@core/services/ItemService';
import { EditTaskModal } from '@/features/settings/EditTaskModal';
import { QuickInputModal } from '@/features/quickinput/QuickInputModal';
import { filterByRules } from '@core/utils/itemFilter';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(isBetween);

// --- 辅助函数 (无变化) ---
// ... 此处省略未改变的辅助函数 ...
function mapTaskToCategory(
    taskFileName: string,
    categoriesConfig: Record<string, { files?: string[] }>,
): string {
    if (!taskFileName || !categoriesConfig) return taskFileName;
    for (const categoryName in categoriesConfig) {
        const categoryInfo = categoriesConfig[categoryName];
        if (categoryInfo.files && categoryInfo.files.some(fileKey => taskFileName.includes(fileKey))) {
            return categoryName;
        }
    }
    return taskFileName;
}
const hexToRgba = (hex: string, alpha = 0.35) => {
    const h = hex.replace("#", "");
    const bigint = parseInt(h, 16);
    return `rgba(${(bigint >> 16) & 255},${(bigint >> 8) & 255},${bigint & 255},${alpha})`;
};
const formatTimeMinute = (minute: number) => {
    const h = Math.floor(minute / 60);
    const m = minute % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
const generateTaskBlockTitle = (block: TaskBlock): string => {
    const isCrossNight = (block.startMinute % 1440) + block.duration > 1440;

    if (isCrossNight) {
        const startDateTime = dayjs(block.actualStartDate).add(block.startMinute, 'minute');
        const endDateTime = startDateTime.add(block.duration, 'minute');
        const startFormat = startDateTime.format('HH:mm');
        const endFormat = endDateTime.format('HH:mm');
        return `任务: ${block.pureText}\n时间: ${startFormat} - ${endFormat}`;
    } else {
        const startTime = formatTimeMinute(block.startMinute);
        const endTime = formatTimeMinute(block.endMinute);
        return `任务: ${block.pureText}\n时间: ${startTime} - ${endTime}`;
    }
};


// --- 子组件定义 (无变化) ---
// ... 此处省略未改变的子组件 ...
const ProgressBlock = ({ categoryHours, order, totalHours, colorMap, untrackedLabel }: any) => {
    const sortedCategories = useMemo(() => {
        const orderToUse = Array.isArray(order) ? order : [];
        const presentCategories = new Set<string>();
        orderToUse.forEach(cat => {
            if ((categoryHours[cat] || 0) > 0.01) {
                presentCategories.add(cat);
            }
        });
        Object.keys(categoryHours).forEach(cat => {
            if ((categoryHours[cat] || 0) > 0.01) {
                presentCategories.add(cat);
            }
        });
        return Array.from(presentCategories);
    }, [categoryHours, order, untrackedLabel]);

    if (sortedCategories.length === 0) return null;

    return (
        <div class="progress-block-container">
            {sortedCategories.map((category) => {
                const hours = categoryHours[category];
                const percent = totalHours > 0 ? (hours / totalHours) * 100 : 0;
                if (percent < 0.1 && hours < 0.01) return null;
                const color = colorMap[category] || '#cccccc';
                const displayPercent = Math.max(percent, 0.5);
                return (
                    <div key={category} title={`${category}: ${hours.toFixed(1)}h (${Math.round(percent)}%)`} class="progress-block-item">
                        <div class="progress-block-bar" style={{ background: color, width: `${displayPercent}%` }} />
                        <span class={`progress-block-text ${displayPercent > 50 ? 'progress-block-text-light' : 'progress-block-text-dark'}`}>
                            {`${category} ${hours.toFixed(1)}h`}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};
const DayColumnHeader = ({ day, blocks, categoriesConfig, colorMap, untrackedLabel, progressOrder }: any) => {
    const { categoryHours, totalDayHours } = useMemo(() => {
        const hours: Record<string, number> = {};
        let trackedHours = 0;
        blocks.forEach((block: TaskBlock) => {
            const category = mapTaskToCategory(block.fileName || '', categoriesConfig);
            const duration = (block.blockEndMinute - block.blockStartMinute) / 60;
            hours[category] = (hours[category] || 0) + duration;
            trackedHours += duration;
        });

        const untrackedHours = Math.max(0, 24 - trackedHours);
        if (untrackedHours > 0.01) {
            hours[untrackedLabel] = untrackedHours;
        }

        return {
            categoryHours: hours,
            totalDayHours: Math.max(24, trackedHours),
        };
    }, [blocks, categoriesConfig, untrackedLabel]);
    
    return (
        <div class="day-column-header">
            <div class="day-header-title">
                {dayjs(day).format('MM-DD ddd')}
            </div>
            <div class="daily-progress-bar">
                <ProgressBlock categoryHours={categoryHours} order={progressOrder} totalHours={totalDayHours} colorMap={colorMap} untrackedLabel={untrackedLabel} />
            </div>
        </div>
    );
};
const TimelineSummaryTable = ({ summaryData, colorMap, progressOrder, untrackedLabel }: any) => {
    if (!summaryData || summaryData.length === 0) {
        return <div class="timeline-empty-state">此时间范围内无数据可供总结。</div>
    }
    return (
        <table class="timeline-summary-table">
            <thead>
                <tr>
                    <th>月份</th>
                    <th>月度总结</th>
                    <th>W1</th><th>W2</th><th>W3</th><th>W4</th><th>W5</th>
                </tr>
            </thead>
            <tbody>
                {summaryData.map((monthData: any) => (
                    <tr key={monthData.month}>
                        <td><strong>{monthData.month}</strong></td>
                        <td><ProgressBlock categoryHours={monthData.monthlySummary} order={progressOrder} totalHours={monthData.totalMonthHours} colorMap={colorMap} untrackedLabel={untrackedLabel} /></td>
                        {monthData.weeklySummaries.map((weekData: any, index: number) => (
                            <td key={index}>
                                {weekData ? <ProgressBlock categoryHours={weekData.summary} order={progressOrder} totalHours={weekData.totalHours} colorMap={colorMap} untrackedLabel={untrackedLabel} /> : null}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};
const DayColumnBody = ({ app, day, blocks, hourHeight, categoriesConfig, colorMap, maxHours, itemService, onColumnClick }: {
    app: App;
    day: string;
    blocks: TaskBlock[];
    hourHeight: number;
    categoriesConfig: any;
    colorMap: any;
    maxHours: number;
    itemService: ItemService;
    onColumnClick: (day: string, e: MouseEvent | TouchEvent) => void;
}) => {
    const [editingTask, setEditingTask] = useState<TaskBlock | null>(null);

    const handleEdit = (block: TaskBlock) => {
        setEditingTask(block);
    };

    const handleCloseModal = () => {
        setEditingTask(null);
    };

    const handleAlignToPrev = (block: TaskBlock, prevBlock: TaskBlock | null) => {
        if (!prevBlock) return;
        const deltaMinutes = prevBlock.blockEndMinute - block.blockStartMinute;
        const newAbsoluteStartMinute = block.startMinute + deltaMinutes;
        const newStartTimeString = formatTimeMinute(newAbsoluteStartMinute);
        itemService.updateItemTime(block.id, { time: newStartTimeString });
    };
    const handleAlignToNext = (block: TaskBlock, nextBlock: TaskBlock | null) => {
        if (!nextBlock) return;
        const deltaDuration = nextBlock.blockStartMinute - block.blockEndMinute;
        const newDuration = block.duration + deltaDuration;
        if (newDuration <= 0) {
            new Notice('无法对齐：任务时长将变为负数或零');
            return;
        }
        itemService.updateItemTime(block.id, { duration: newDuration });
    };

    return (
        <div 
            class="day-column-body"
            style={{ height: `${maxHours * hourHeight}px` }}
            onClick={(e) => onColumnClick(day, e as any)}
            onTouchStart={(e) => onColumnClick(day, e as any)}
        >
            {editingTask && (
                <EditTaskModal
                    isOpen={true}
                    onClose={handleCloseModal}
                    task={editingTask}
                    itemService={itemService}
                />
            )}
            {blocks.map((block: TaskBlock, index: number) => {
                const top = (block.blockStartMinute / 60) * hourHeight;
                const height = ((block.blockEndMinute - block.blockStartMinute) / 60) * hourHeight;
                const category = mapTaskToCategory(block.fileName || '', categoriesConfig);
                const color = colorMap[category] || '#ccc';
                const prevBlock = index > 0 ? blocks[index - 1] : null;
                const nextBlock = index < blocks.length - 1 ? blocks[index + 1] : null;
                const canAlignToNext = nextBlock && (nextBlock.blockStartMinute > block.blockStartMinute);

                return (
                    <div 
                        key={block.id + block.day}
                        class="timeline-task-block"
                        title={generateTaskBlockTitle(block)}
                        style={{ top: `${top}px`, height: `${Math.max(height, 2)}px` }}
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                    >
                        <a 
                            class="timeline-task-link"
                            onClick={(e) => { e.preventDefault(); window.open(makeObsUri(block, app)); }}
                        >
                            <div class="timeline-task-indicator" style={{ background: color }}></div>
                            <div class="timeline-task-content" style={{ background: hexToRgba(color) }}>
                                {block.pureText}
                            </div>
                        </a>
                        <div class="task-buttons">
                            <button class="task-button" title="向前对齐" disabled={!prevBlock} onClick={() => handleAlignToPrev(block, prevBlock)}>⇡</button>
                            <button class="task-button" title="向后对齐" disabled={!canAlignToNext} onClick={() => handleAlignToNext(block, nextBlock)}>⇣</button>
                            <button class="task-button" title="精确编辑" onClick={() => handleEdit(block)}>✎</button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


// --- 主视图组件 ---
interface TimelineViewProps {
    items: Item[];
    dateRange: [Date, Date];
    module: any;
    currentView: '年' | '季' | '月' | '周' | '天';
    app: App;
    itemService: ItemService;
    inputSettings: any;
}

export function TimelineView({ items, dateRange, module, currentView, app, itemService, inputSettings }: TimelineViewProps) {
    const inputBlocks = inputSettings?.blocks || [];

    const config = useMemo(() => {
        const defaults = JSON.parse(JSON.stringify(DEFAULT_TIMELINE_CONFIG));
        const userConfig = module.viewConfig || {};
        return { ...defaults, ...userConfig, categories: userConfig.categories || defaults.categories };
    }, [module.viewConfig]);
    
    const [hourHeight, setHourHeight] = useState(config.defaultHourHeight);
    const initialPinchDistanceRef = useRef<number | null>(null);
    const initialHourHeightRef = useRef<number | null>(null);

    useEffect(() => {
        setHourHeight(config.defaultHourHeight);
    }, [config.defaultHourHeight]);

    const timelineTasks = useMemo(() => {
        const filteredItems = module.filters ? filterByRules(items, module.filters) : items;
        return processItemsToTimelineTasks(filteredItems);
    }, [items, module.filters]);

    const colorMap = useMemo(() => {
        const finalColorMap: Record<string, string> = {};
        const categoriesConfig = config.categories || {};
        for(const categoryName in categoriesConfig) {
            finalColorMap[categoryName] = categoriesConfig[categoryName].color;
        }
        finalColorMap[config.UNTRACKED_LABEL] = "#9ca3af";
        return finalColorMap;
    }, [config.categories, config.UNTRACKED_LABEL]);

    const handleWheel = useCallback((e: WheelEvent) => {
        if (!e.altKey) return;
        e.preventDefault();
        const step = 5;
        const minHeight = 10;
        const maxHeight = 200;
        setHourHeight((currentHeight: number) => {
            const newHeight = e.deltaY < 0 ? currentHeight + step : currentHeight - step;
            return Math.max(minHeight, Math.min(maxHeight, newHeight));
        });
    }, []);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const distance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            initialPinchDistanceRef.current = distance;
            initialHourHeightRef.current = hourHeight;
        }
    }, [hourHeight]);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (e.touches.length === 2 && initialPinchDistanceRef.current) {
            e.preventDefault();
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const currentDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            
            const scale = currentDistance / initialPinchDistanceRef.current;
            const newHeight = (initialHourHeightRef.current || config.defaultHourHeight) * scale;

            const minHeight = 10;
            const maxHeight = 200;
            setHourHeight(Math.max(minHeight, Math.min(maxHeight, newHeight)));
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        initialPinchDistanceRef.current = null;
        initialHourHeightRef.current = null;
    }, []);

    if (timelineTasks.length === 0) {
        return <div class="timeline-empty-state">当前范围内没有数据。</div>
    }
    
    if (currentView === '年' || currentView === '季') {
        const summaryData = useMemo(() => {
            const data: any[] = [];
            let month = dayjs(dateRange[0]).startOf('month');
            const end = dayjs(dateRange[1]).endOf('month');

            while (month.isBefore(end) || month.isSame(end, 'month')) {
                const monthStr = month.format('YYYY-MM');
                const tasksInMonth = timelineTasks.filter(t => dayjs(t.doneDate).format('YYYY-MM') === monthStr);
                
                const monthlySummary: Record<string, number> = {};
                let totalTrackedHoursInMonth = 0;
                tasksInMonth.forEach(task => {
                    const category = mapTaskToCategory(task.fileName || '', config.categories);
                    const durationHours = task.duration / 60;
                    monthlySummary[category] = (monthlySummary[category] || 0) + durationHours;
                    totalTrackedHoursInMonth += durationHours;
                });

                const daysInMonth = month.daysInMonth();
                const untrackedHoursInMonth = Math.max(0, daysInMonth * 24 - totalTrackedHoursInMonth);
                if (untrackedHoursInMonth > 0.01) {
                    monthlySummary[config.UNTRACKED_LABEL] = untrackedHoursInMonth;
                }

                if (Object.keys(monthlySummary).length > 0) {
                    const weeklySummaries = Array.from({ length: 5 }).map((_, i) => {
                        const weekStartDay = i * 7 + 1;
                        if (weekStartDay > daysInMonth) return null;

                        const weeklySummary: Record<string, number> = {};
                        let totalTrackedHoursInWeek = 0;

                        tasksInMonth.forEach(task => {
                            const taskDay = dayjs(task.doneDate).date();
                            if (taskDay >= weekStartDay && taskDay < weekStartDay + 7) {
                                const category = mapTaskToCategory(task.fileName || '', config.categories);
                                const durationHours = task.duration / 60;
                                weeklySummary[category] = (weeklySummary[category] || 0) + durationHours;
                                totalTrackedHoursInWeek += durationHours;
                            }
                        });
                        
                        if (totalTrackedHoursInWeek < 0.01) return null;

                        const daysInThisWeekSlice = Math.min(7, daysInMonth - weekStartDay + 1);
                        const untrackedHoursInWeek = Math.max(0, daysInThisWeekSlice * 24 - totalTrackedHoursInWeek);
                        if (untrackedHoursInWeek > 0.01) {
                            weeklySummary[config.UNTRACKED_LABEL] = untrackedHoursInWeek;
                        }

                        return {
                            summary: weeklySummary,
                            totalHours: daysInThisWeekSlice * 24,
                        };
                    });

                    data.push({
                        month: monthStr,
                        monthlySummary,
                        totalMonthHours: daysInMonth * 24,
                        weeklySummaries,
                    });
                }
                
                month = month.add(1, 'month');
            }
            return data;
        }, [timelineTasks, dateRange, config]);
        return <TimelineSummaryTable summaryData={summaryData} colorMap={colorMap} progressOrder={config.progressOrder} untrackedLabel={config.UNTRACKED_LABEL} />;
    }
    
    const summaryCategoryHours = useMemo(() => {
        const viewStart = dayjs(dateRange[0]);
        const viewEnd = dayjs(dateRange[1]);
        const tasksInCurrentRange = timelineTasks.filter(task => {
            const taskDate = dayjs(task.doneDate);
            return taskDate.isBetween(viewStart, viewEnd, 'day', '[]');
        });

        const hours: Record<string, number> = {};
        let totalTrackedHours = 0;
        tasksInCurrentRange.forEach(task => {
            const category = mapTaskToCategory(task.fileName || '', config.categories);
            const durationHours = task.duration / 60;
            hours[category] = (hours[category] || 0) + durationHours;
            totalTrackedHours += durationHours;
        });

        const dayCount = dayjs(dateRange[1]).diff(dayjs(dateRange[0]), 'day') + 1;
        const untrackedHours = Math.max(0, dayCount * 24 - totalTrackedHours);
        if (untrackedHours > 0.01) {
            hours[config.UNTRACKED_LABEL] = untrackedHours;
        }
        
        return hours;
    }, [timelineTasks, dateRange, config]);
    
    const dailyViewData = useMemo(() => {
        const start = dayjs(dateRange[0]);
        const end = dayjs(dateRange[1]);
        const diff = end.diff(start, 'day');
        const dateRangeDays = Array.from({ length: diff + 1 }, (_, i) => start.add(i, 'day'));
        const map: Record<string, TaskBlock[]> = {};
        const range: [dayjs.Dayjs, dayjs.Dayjs] = [start, end];

        dateRangeDays.forEach(day => map[day.format('YYYY-MM-DD')] = []);
        for (const task of timelineTasks) {
            const blocks = splitTaskIntoDayBlocks(task, range);
            for (const block of blocks) {
                if (map[block.day]) map[block.day].push(block);
            }
        }
        Object.values(map).forEach(dayBlocks => {
            dayBlocks.sort((a, b) => a.blockStartMinute - b.blockStartMinute);
        });

        return { dateRangeDays, blocksByDay: map };
    }, [timelineTasks, dateRange]);


    const handleColumnClick = useCallback((day: string, e: MouseEvent | TouchEvent) => {
        if (!inputBlocks || inputBlocks.length === 0) {
            new Notice('没有可用的Block模板，请先在设置中创建一个。');
            return;
        }
        let taskBlock = inputBlocks.find((b: any) => b.name === 'Task' || b.name === '任务');
        if (!taskBlock) {
            taskBlock = inputBlocks[0];
        }

        const targetEl = e.currentTarget as HTMLElement;
        const rect = targetEl.getBoundingClientRect();
        
        let clientY = 0;
        if ('touches' in e) {
            clientY = e.touches[0].clientY;
        } else {
            clientY = e.clientY;
        }

        const y = clientY - rect.top;
        const clickedMinute = Math.floor((y / hourHeight) * 60);

        const dayBlocks = dailyViewData.blocksByDay[day] || [];
        const prevBlock = dayBlocks.filter(b => b.blockEndMinute <= clickedMinute).pop();
        const nextBlock = dayBlocks.find(b => b.blockStartMinute >= clickedMinute);

        const context: Record<string, any> = { '日期': day };
        if (prevBlock) {
            context['时间'] = minutesToTime(prevBlock.blockEndMinute);
        } else {
            context['时间'] = minutesToTime(clickedMinute);
        }
        if (nextBlock) {
            context['结束'] = minutesToTime(nextBlock.blockStartMinute);
        }
        
        new QuickInputModal(app, taskBlock.id, context).open();

    }, [app, inputBlocks, hourHeight, dailyViewData]);


    if (dailyViewData) {
        const totalSummaryHours = Object.values(summaryCategoryHours || {}).reduce((s, h) => s + h, 0);
        const TIME_AXIS_WIDTH = 90;

        return (
            <div 
                class="timeline-view-wrapper" 
                style={{ overflowX: 'auto' }} 
                onWheel={handleWheel as any}
                onTouchStart={handleTouchStart as any}
                onTouchMove={handleTouchMove as any}
                onTouchEnd={handleTouchEnd as any}
            >
                <div class="timeline-sticky-header">
                    <div class="summary-progress-container" style={{ flex: `0 0 ${TIME_AXIS_WIDTH}px` }}>
                        <div class="summary-title">总结</div>
                        <div class="summary-content">
                            {summaryCategoryHours && totalSummaryHours > 0 && (
                                <ProgressBlock categoryHours={summaryCategoryHours} order={config.progressOrder} totalHours={totalSummaryHours} colorMap={colorMap} untrackedLabel={config.UNTRACKED_LABEL} />
                            )}
                        </div>
                    </div>
                    {dailyViewData.dateRangeDays.map(day => {
                        const dayStr = day.format('YYYY-MM-DD');
                        const blocks = dailyViewData.blocksByDay[dayStr] || [];
                        return <DayColumnHeader key={dayStr} day={dayStr} blocks={blocks} categoriesConfig={config.categories} colorMap={colorMap} untrackedLabel={config.UNTRACKED_LABEL} progressOrder={config.progressOrder} />;
                    })}
                </div>
                
                <div class="timeline-scrollable-body" style={{ display: 'flex' }}>
                    <div class="time-axis" style={{ flex: `0 0 ${TIME_AXIS_WIDTH}px` }}>
                       {Array.from({ length: config.MAX_HOURS_PER_DAY + 1 }, (_, i) => (
                           <div key={i} style={{ height: `${hourHeight}px`, borderBottom: '1px dashed var(--background-modifier-border-hover)', position: 'relative', boxSizing: 'border-box', textAlign: 'right', paddingRight: '4px', fontSize: '11px', color: 'var(--text-faint)' }}>
                               {i > 0 && i % 2 === 0 ? `${i}:00` : ''}
                           </div>
                       ))}
                    </div>
                    {dailyViewData.dateRangeDays.map(day => {
                        const dayStr = day.format('YYYY-MM-DD');
                        const blocks = dailyViewData.blocksByDay[dayStr] || [];
                        return <DayColumnBody 
                                    key={dayStr} 
                                    app={app} 
                                    day={dayStr}
                                    blocks={blocks} 
                                    hourHeight={hourHeight} 
                                    categoriesConfig={config.categories} 
                                    colorMap={colorMap} 
                                    maxHours={config.MAX_HOURS_PER_DAY} 
                                    itemService={itemService}
                                    onColumnClick={handleColumnClick}
                                />;
                    })}
                </div>
            </div>
        );
    }

    return null;
}
