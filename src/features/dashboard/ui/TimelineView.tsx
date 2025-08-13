// src/features/dashboard/ui/TimelineView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useRef, useState, useEffect, useMemo } from 'preact/hooks';
import { Item } from '@core/domain/schema';
import { makeObsUri } from '@core/utils/obsidian';
import { processItemsToTimelineTasks, splitTaskIntoDayBlocks, TaskBlock } from '../views/timeline/timeline-parser';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import { DEFAULT_CONFIG as DEFAULT_TIMELINE_CONFIG } from '../settings/ModuleEditors/TimelineViewEditor';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

// --- 统一的、健壮的分类匹配函数 ---
function mapTaskToCategory(taskFileName: string, categoriesConfig: Record<string, { files?: string[] }>): string {
    if (!taskFileName || !categoriesConfig) return taskFileName;
    for (const categoryName in categoriesConfig) {
        const categoryInfo = categoriesConfig[categoryName];
        if (categoryInfo.files && categoryInfo.files.some(fileKey => taskFileName.includes(fileKey))) {
            return categoryName;
        }
    }
    return taskFileName;
}

// --- 帮助函数 ---
const hexToRgba = (hex: string, alpha = 0.35) => {
  const h = hex.replace("#", "");
  const bigint = parseInt(h, 16);
  return `rgba(${(bigint >> 16) & 255},${(bigint >> 8) & 255},${bigint & 255},${alpha})`;
};
const formatTime = (minute: number) => {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// --- 子组件 ---
const ProgressBlock = ({ categoryHours, order, totalHours, colorMap, untrackedLabel }: any) => {
  const sortedCategories = useMemo(() => {
    const orderToUse = Array.isArray(order) ? order : [];
    const presentCategories = new Set(orderToUse.filter((cat) => (categoryHours[cat] || 0) > 0.01));
    Object.keys(categoryHours).forEach(cat => {
        if ((categoryHours[cat] || 0) > 0.01) {
            presentCategories.add(cat);
        }
    });
    if ((categoryHours[untrackedLabel] || 0) > 0.01) {
      presentCategories.add(untrackedLabel);
    }
    return Array.from(presentCategories);
  }, [categoryHours, order, untrackedLabel]);

  if (sortedCategories.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px' }}>
      {sortedCategories.map((category) => {
        const hours = categoryHours[category];
        const percent = totalHours > 0 ? (hours / totalHours) * 100 : 0;
        if (percent < 1 && hours < 0.1) return null;
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
    const categoryHours = useMemo(() => {
        const hours: Record<string, number> = {};
        blocks.forEach((block: TaskBlock) => {
            const category = mapTaskToCategory(block.fileName, categoriesConfig);
            hours[category] = (hours[category] || 0) + (block.blockEndMinute - block.blockStartMinute) / 60;
        });
        return hours;
    }, [blocks, categoriesConfig]);
    
    const trackedHours = Object.values(categoryHours).reduce((sum: number, h) => sum + h, 0);
    const totalDayHours = Math.max(trackedHours, 0.1);

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

const DayColumnBody = ({ blocks, hourHeight, categoriesConfig, colorMap, maxHours }: any) => {
    return (
        <div style={{ flex: '0 0 150px', borderLeft: '1px solid var(--background-modifier-border)', position: 'relative', height: `${maxHours * hourHeight}px` }}>
            {blocks.map((block: TaskBlock) => {
                const top = (block.blockStartMinute / 60) * hourHeight;
                const height = ((block.blockEndMinute - block.blockStartMinute) / 60) * hourHeight;
                const category = mapTaskToCategory(block.fileName, categoriesConfig);
                const color = colorMap[category] || '#ccc';
                return (
                    <a key={block.id + block.day} href={makeObsUri(block)} class="internal-link" target="_blank" rel="noopener"
                        title={`任务: ${block.pureText}\n时间: ${formatTime(block.startMinute)} - ${formatTime(block.endMinute)}`}
                        style={{ position: 'absolute', left: '2px', right: '2px', top: `${top}px`, height: `${Math.max(height, 2)}px`, display: 'flex', overflow: 'hidden', borderRadius: '2px' }}
                    >
                        <div style={{ width: '4px', background: color }}></div>
                        <div style={{ flex: 1, background: hexToRgba(color), padding: '2px 4px', fontSize: '12px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: 'var(--text-normal)' }}>
                            {block.pureText}
                        </div>
                    </a>
                );
            })}
        </div>
    );
};

const TimelineSummaryTable = ({ summaryData, colorMap, progressOrder }: any) => {
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
                        <td><ProgressBlock categoryHours={monthData.monthlySummary} order={progressOrder} totalHours={monthData.totalMonthHours} colorMap={colorMap} untrackedLabel="" /></td>
                        {monthData.weeklySummaries.map((weekSummary: any, index: number) => (
                            <td key={index}>
                                {weekSummary ? <ProgressBlock categoryHours={weekSummary} order={progressOrder} totalHours={Object.values(weekSummary).reduce((s: number, h: any) => s + h, 0)} colorMap={colorMap} untrackedLabel="" /> : null}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

// --- 主视图组件 ---
interface TimelineViewProps {
  items: Item[];
  dateRange: [Date, Date];
  module: any; // ViewInstance
  currentView: '年' | '季' | '月' | '周' | '天';
}

export function TimelineView({ items, dateRange, module, currentView }: TimelineViewProps) {
  const config = useMemo(() => {
    const defaults = structuredClone(DEFAULT_TIMELINE_CONFIG);
    const userConfig = module.viewConfig?.viewConfig || module.viewConfig || {};
    return { ...defaults, ...userConfig };
  }, [module.viewConfig]);

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const timelineTasks = useMemo(() => processItemsToTimelineTasks(items), [items]);

  const colorMap = useMemo(() => {
    const finalColorMap: Record<string, string> = {};
    const categoriesConfig = config.categories || {};
    for(const categoryName in categoriesConfig) {
        finalColorMap[categoryName] = categoriesConfig[categoryName].color;
    }
    finalColorMap[config.UNTRACKED_LABEL] = "#9ca3af";
    return finalColorMap;
  }, [config.categories, config.UNTRACKED_LABEL]);

  const summaryData = useMemo(() => {
    if (currentView !== '年' && currentView !== '季') return null;
    const data: any[] = [];
    let month = dayjs(dateRange[0]).startOf('month');
    const end = dayjs(dateRange[1]).endOf('month');
    while (month.isSame(end) || month.isBefore(end)) {
      const weeks = [];
      let week = month.clone().startOf('isoWeek');
      for (let i = 0; i < 6; i++) {
        if (week.month() === month.month()) {
          weeks.push({ start: week, end: week.clone().endOf('isoWeek') });
        }
        const nextWeek = week.add(1, 'week');
        if (nextWeek.month() !== month.month() && i < 4) {
             for (let j=weeks.length; j<5; j++) weeks.push(null);
             break;
        }
        week = nextWeek;
      }

      const monthlySummary: Record<string, number> = {};
      const weeklySummaries = weeks.map(w => {
        if (!w) return null;
        const weeklySummary: Record<string, number> = {};
        timelineTasks.forEach(task => {
          const taskStart = dayjs(task.doneDate);
          if (taskStart.isBetween(w.start, w.end, null, '[]')) {
            const category = mapTaskToCategory(task.fileName, config.categories);
            const durationHours = task.duration / 60;
            weeklySummary[category] = (weeklySummary[category] || 0) + durationHours;
            monthlySummary[category] = (monthlySummary[category] || 0) + durationHours;
          }
        });
        return Object.keys(weeklySummary).length > 0 ? weeklySummary : null;
      });
      if(Object.keys(monthlySummary).length > 0) {
        data.push({
            month: month.format('YYYY-MM'),
            monthlySummary,
            totalMonthHours: Object.values(monthlySummary).reduce((s: number, h) => s + h, 0),
            weeklySummaries,
        });
      }
      month = month.add(1, 'month');
    }
    return data;
  }, [timelineTasks, dateRange, currentView, config.categories]);

  const summaryCategoryHours = useMemo(() => {
      if(currentView === '年' || currentView === '季') return null;
      const hours: Record<string, number> = {};
      timelineTasks.forEach(task => {
          const category = mapTaskToCategory(task.fileName, config.categories);
          hours[category] = (hours[category] || 0) + task.duration / 60;
      });
      return hours;
  }, [timelineTasks, config.categories, currentView]);

  const dailyViewData = useMemo(() => {
    if (currentView === '年' || currentView === '季') return null;
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
    return { dateRangeDays, blocksByDay: map };
  }, [timelineTasks, dateRange, currentView]);

  if (timelineTasks.length === 0) {
    return <div style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '20px' }}>当前范围内没有可供可视化的任务。</div>
  }
  
  if ((currentView === '年' || currentView === '季')) {
      return <TimelineSummaryTable summaryData={summaryData} colorMap={colorMap} progressOrder={config.progressOrder} />
  }

  if (dailyViewData) {
    const totalSummaryHours = Object.values(summaryCategoryHours || {}).reduce((s, h) => s + h, 0);
    const TIME_AXIS_WIDTH = 90;

    return (
        <div class="timeline-view-wrapper" style={{ overflowX: 'auto' }}>
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
                        <div key={i} style={{ height: `${config.defaultHourHeight}px`, borderBottom: '1px dashed var(--background-modifier-border-hover)', position: 'relative', boxSizing: 'border-box', textAlign: 'right', paddingRight: '4px', fontSize: '11px', color: 'var(--text-faint)' }}>
                           {i > 0 && i % 2 === 0 ? `${i}:00` : ''}
                        </div>
                    ))}
                </div>
                {dailyViewData.dateRangeDays.map(day => {
                    const dayStr = day.format('YYYY-MM-DD');
                    const blocks = dailyViewData.blocksByDay[dayStr] || [];
                    return <DayColumnBody key={dayStr} blocks={blocks} hourHeight={config.defaultHourHeight} categoriesConfig={config.categories} colorMap={colorMap} maxHours={config.MAX_HOURS_PER_DAY} />;
                })}
            </div>
        </div>
    );
  }

  return null;
}