// src/features/dashboard/ui/TimelineView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useCallback, useState, useEffect, useRef } from 'preact/hooks';
import { Item } from '../../../lib/types/domain/schema';
import { makeObsUri } from '../../../lib/utils/core/obsidian';
import { processItemsToTimelineTasks, splitTaskIntoDayBlocks, TaskBlock } from '../views/timeline/timeline-parser';
import { dayjs, minutesToTime } from '../../../lib/utils/core/date';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween';
import { DEFAULT_CONFIG as DEFAULT_TIMELINE_CONFIG } from '../../Settings/ui/components/view-editors/TimelineViewEditor';
import { App, Notice } from 'obsidian';
import { TaskService } from '../../../lib/services/core/taskService';
import { EditTaskModal } from './EditTaskModal';
import { useStore } from '../../../store/AppStore';
import { QuickInputModal } from '../../QuickInput/ui/QuickInputModal';
import { dataStore } from '../../../store/storeRegistry';
import { filterByRules } from '../../../lib/utils/core/itemFilter';

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px' }}>
            {sortedCategories.map((category) => {
                const hours = categoryHours[category];
                const percent = totalHours > 0 ? (hours / totalHours) * 100 : 0;
                if (percent < 0.1 && hours < 0.01) return null;
                const color = colorMap[category] || '#cccccc';
                const displayPercent = Math.max(percent, 0.5);
                return (
                    <div key={category} title={`${category}: ${hours.toFixed(1)}h (${Math.round(percent)}%)`} style={{ width: '100%', height: '16px', background: '#e5e7eb', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                        <div style={{ background: color, width: `${displayPercent}%`, height: '100%' }} />
                        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 500, color: displayPercent > 50 ? '#fff' : '#222', whiteSpace: 'nowrap' }}>
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
            const category = mapTaskToCategory(block.fileName, categoriesConfig);
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
        <div class="day-column-header" style={{ flex: '0 0 150px', borderLeft: '1px solid var(--background-modifier-border)' }}>
            <div style={{ fontWeight: 'bold', textAlign: 'center', height: '24px', lineHeight: '24px', borderBottom: '1px solid var(--background-modifier-border-hover)' }}>
                {dayjs(day).format('MM-DD ddd')}
            </div>
            <div class="daily-progress-bar" style={{ minHeight: '60px' }}>
                <ProgressBlock categoryHours={categoryHours} order={progressOrder} totalHours={totalDayHours} colorMap={colorMap} untrackedLabel={untrackedLabel} />
            </div>
        </div>
    );
};
const TimelineSummaryTable = ({ summaryData, colorMap, progressOrder, untrackedLabel }: any) => {
    if (!summaryData || summaryData.length === 0) {
        return <div style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '20px' }}>此时间范围内无数据可供总结。</div>
    }
    return (
        <table class="think-table">
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
const DayColumnBody = ({ app, day, blocks, hourHeight, categoriesConfig, colorMap, maxHours, taskService, onColumnClick }: {
    app: App;
    day: string;
    blocks: TaskBlock[];
    hourHeight: number;
    categoriesConfig: any;
    colorMap: any;
    maxHours: number;
    taskService: TaskService;
    onColumnClick: (day: string, e: MouseEvent | TouchEvent) => void;
}) => {
    const handleEdit = (block: TaskBlock) => {
        new EditTaskModal(app, block, undefined, taskService).open();
    };
    const handleAlignToPrev = (block: TaskBlock, prevBlock: TaskBlock | null) => {
        if (!prevBlock) return;
        const deltaMinutes = prevBlock.blockEndMinute - block.blockStartMinute;
        const newAbsoluteStartMinute = block.startMinute + deltaMinutes;
        const newStartTimeString = formatTimeMinute(newAbsoluteStartMinute);
        taskService.updateTaskTime(block.id, { time: newStartTimeString });
    };
    const handleAlignToNext = (block: TaskBlock, nextBlock: TaskBlock | null) => {
        if (!nextBlock) return;
        const deltaDuration = nextBlock.blockStartMinute - block.blockEndMinute;
        const newDuration = block.duration + deltaDuration;
        if (newDuration <= 0) {
            new Notice('无法对齐：任务时长将变为负数或零');
            return;
        }
        taskService.updateTaskTime(block.id, { duration: newDuration });
    };

    return (
        <div 
            style={{ flex: '0 0 150px', borderLeft: '1px solid var(--background-modifier-border)', position: 'relative', height: `${maxHours * hourHeight}px`, cursor: 'cell' }}
            onClick={(e) => onColumnClick(day, e as any)}
            onTouchStart={(e) => onColumnClick(day, e as any)}
        >
            {blocks.map((block: TaskBlock, index: number) => {
                const top = (block.blockStartMinute / 60) * hourHeight;
                const height = ((block.blockEndMinute - block.blockStartMinute) / 60) * hourHeight;
                const category = mapTaskToCategory(block.fileName, categoriesConfig);
                const color = colorMap[category] || '#ccc';
                const prevBlock = index > 0 ? blocks[index - 1] : null;
                const nextBlock = index < blocks.length - 1 ? blocks[index + 1] : null;
                const canAlignToNext = nextBlock && (nextBlock.blockStartMinute > block.blockStartMinute);

                return (
                    <div 
                        key={block.id + block.day}
                        class="timeline-task-block"
                        title={generateTaskBlockTitle(block)}
                        style={{ position: 'absolute', left: '2px', right: '2px', top: `${top}px`, height: `${Math.max(height, 2)}px` }}
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                    >
                        <a 
                            onClick={(e) => { e.preventDefault(); window.open(makeObsUri(block, app)); }}
                            style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', borderRadius: '2px' }}
                        >
                            <div style={{ width: '4px', background: color }}></div>
                            <div style={{ flex: 1, background: hexToRgba(color), padding: '2px 4px', fontSize: '12px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: 'var(--text-normal)' }}>
                                {block.pureText}
                            </div>
                        </a>
                        <div class="task-buttons">
                            <button title="向前对齐" disabled={!prevBlock} onClick={() => handleAlignToPrev(block, prevBlock)}>⇡</button>
                            <button title="向后对齐" disabled={!canAlignToNext} onClick={() => handleAlignToNext(block, nextBlock)}>⇣</button>
                            <button title="精确编辑" onClick={() => handleEdit(block)}>✎</button>
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
    taskService: TaskService;
}

export function TimelineView({ items, dateRange, module, currentView, app, taskService }: TimelineViewProps) {
    const inputBlocks = useStore(state => state.settings.inputSettings.blocks);
    const allDataSources = useStore(state => state.settings.dataSources);

    const config = useMemo(() => {
        const defaults = JSON.parse(JSON.stringify(DEFAULT_TIMELINE_CONFIG));
        const userConfig = module.viewConfig || {};
        return { ...defaults, ...userConfig, categories: userConfig.categories || defaults.categories };
    }, [module.viewConfig]);
    
    const [hourHeight, setHourHeight] = useState(config.defaultHourHeight);
    const initialPinchDistanceRef = useRef<number | null>(null);
    const initialHourHeightRef = useRef<number | null>(null);

    // [核心修改] 创建一个 state 来存储从 DataStore 来的所有 items，并初始化
    const [allItems, setAllItems] = useState(() => dataStore?.queryItems() || []);

    // [核心修改] 创建一个 effect 来订阅 DataStore 的变化
    useEffect(() => {
        if (!dataStore) return;

        // 定义监听器：当 dataStore 通知变化时，用最新数据更新我们的 state
        const listener = () => {
            setAllItems(dataStore.queryItems());
        };

        dataStore.subscribe(listener); // 订阅

        // 组件卸载时，取消订阅以防止内存泄漏
        return () => dataStore.unsubscribe(listener);
    }, []); // 空依赖数组 `[]` 意味着这个 effect 只会在组件挂载时运行一次

    useEffect(() => {
        setHourHeight(config.defaultHourHeight);
    }, [config.defaultHourHeight]);

    const timelineTasks = useMemo(() => {
        const dataSource = allDataSources.find(ds => ds.id === module.dataSourceId);
        if (!dataSource) return [];

        // [核心修改] 使用我们可响应的 allItems state，并调用正确的 filterByRules 函数
        const baseItems = filterByRules(allItems, dataSource.filters);

        return processItemsToTimelineTasks(baseItems);
    // [核心修改] 将 allItems 添加到依赖数组，这样当 allItems 更新时，本 useMemo 会重新计算
    }, [module.dataSourceId, allDataSources, allItems]);

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
        setHourHeight(currentHeight => {
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
        return <div style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '20px' }}>当前范围内没有数据。</div>
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
                    const category = mapTaskToCategory(task.fileName, config.categories);
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
                                const category = mapTaskToCategory(task.fileName, config.categories);
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
            const category = mapTaskToCategory(task.fileName, config.categories);
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
        let taskBlock = inputBlocks.find(b => b.name === 'Task' || b.name === '任务');
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
                <div class="timeline-sticky-header" style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--background-primary)', display: 'flex' }}>
                    <div class="summary-progress-container" style={{ flex: `0 0 ${TIME_AXIS_WIDTH}px`, borderBottom: '1px solid var(--background-modifier-border)' }}>
                        <div style={{height: '24px', lineHeight: '24px', textAlign:'center', fontWeight:'bold', borderBottom: '1px solid var(--background-modifier-border-hover)'}}>总结</div>
                        <div style={{ minHeight: '60px' }}>
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
                                    taskService={taskService}
                                    onColumnClick={handleColumnClick}
                                />;
                    })}
                </div>
            </div>
        );
    }

    return null;
}