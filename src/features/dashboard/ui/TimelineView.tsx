// src/features/dashboard/ui/TimelineView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useRef, useState, useEffect, useMemo } from 'preact/hooks';
import { Item, ModuleConfig } from '@core/domain/schema';
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
    if (!taskFileName || !categoriesConfig) {
        return taskFileName; // Fallback
    }
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
    const presentCategories = order.filter((cat: string) => (categoryHours[cat] || 0) > 0.01);
    if ((categoryHours[untrackedLabel] || 0) > 0.01 && !presentCategories.includes(untrackedLabel)) {
      presentCategories.push(untrackedLabel);
    }
    return presentCategories;
  }, [categoryHours, order, untrackedLabel]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px' }}>
      {sortedCategories.map((category:string) => {
        const hours = categoryHours[category];
        const percent = totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0;
        if (percent < 1) return null;
        const color = colorMap[category];
        return (
          <div key={category} title={`${category}: ${hours.toFixed(1)}h (${percent}%)`} style={{ width: '100%', height: '16px', background: '#e5e7eb', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ background: color, width: `${percent}%`, height: '100%' }} />
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 500, color: percent > 50 ? '#fff' : '#222', whiteSpace: 'nowrap' }}>
              {`${category} ${hours.toFixed(1)}h`}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const DayColumn = ({ day, blocks, hourHeight, categoriesConfig, colorMap, maxHours, untrackedLabel, progressOrder, colorPalette }: any) => {
  const categoryHours = useMemo(() => {
    const hours: Record<string, number> = {};
    blocks.forEach((block: TaskBlock) => {
      const category = mapTaskToCategory(block.fileName, categoriesConfig);
      hours[category] = (hours[category] || 0) + (block.blockEndMinute - block.blockStartMinute) / 60;
    });
    return hours;
  }, [blocks, categoriesConfig]);
  
  const trackedHours = Object.values(categoryHours).reduce((sum, h) => sum + h, 0);
  if (trackedHours < maxHours) {
    categoryHours[untrackedLabel] = maxHours - trackedHours;
  }
  
  return (
    <div style={{ flex: '0 0 150px', borderLeft: '1px solid #e5e7eb', position: 'relative' }}>
      <div style={{ position: 'sticky', top: 0, background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'center', zIndex: 2, height: '24px', lineHeight: '24px' }}>
        {dayjs(day).format('MM-DD ddd')}
      </div>
      <div style={{ background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', minHeight: '80px' }}>
        <ProgressBlock categoryHours={categoryHours} order={progressOrder} totalHours={maxHours} colorMap={colorMap} untrackedLabel={untrackedLabel} />
      </div>
      <div style={{ position: 'relative', height: `${maxHours * hourHeight}px` }}>
        {blocks.map((block: TaskBlock) => {
          const top = (block.blockStartMinute / 60) * hourHeight;
          const height = ((block.blockEndMinute - block.blockStartMinute) / 60) * hourHeight;
          const category = mapTaskToCategory(block.fileName, categoriesConfig);
          const color = colorMap[category] || '#ccc';
          
          return (
            <a key={block.id + block.day} href={makeObsUri(block)} class="internal-link" target="_blank" rel="noopener"
              title={`任务: ${block.pureText}\n时间: ${formatTime(block.startMinute)} - ${formatTime(block.endMinute)}`}
              style={{ position: 'absolute', left: '2px', right: '2px', top: `${top}px`, height: `${height}px`, display: 'flex', overflow: 'hidden', borderRadius: '2px' }}
            >
              <div style={{ width: '4px', background: color }}></div>
              <div style={{ flex: 1, background: hexToRgba(color), padding: '2px 4px', fontSize: '12px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: 'var(--text-normal)' }}>
                {block.pureText}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
};

const WeekColumn = ({ week, categoryHours, totalHours, colorMap, order }: any) => {
  const sortedCategories = useMemo(() => {
    return order.filter((cat: string) => (categoryHours[cat] || 0) > 0.01);
  }, [categoryHours, order]);

  return (
    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minWidth: '80px', borderLeft: '1px solid #e5e7eb', padding: '0 2px 4px 2px' }}>
      <div style={{ textAlign: 'center', fontSize: '12px', padding: '4px 0', fontWeight: 500, color: 'var(--text-muted)' }}>{week.title}</div>
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column-reverse', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
        {sortedCategories.map((category:string) => {
          const hours = categoryHours[category];
          const percent = totalHours > 0 ? (hours / totalHours) * 100 : 0;
          if (percent < 0.1) return null;
          const color = colorMap[category];
          return (
            <div key={category}
                 title={`${category}: ${hours.toFixed(1)}h (${Math.round(percent)}%)`}
                 style={{ height: `${percent}%`, background: color }}
            />
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 'bold', paddingTop: '2px' }}>
        {totalHours.toFixed(1)}h
      </div>
    </div>
  );
};

// --- 主视图组件 ---
interface TimelineViewProps {
  items: Item[];
  dateRange: [Date, Date];
  module: ModuleConfig; // Actually a ViewInstance
}

export function TimelineView({ items, dateRange, module }: TimelineViewProps) {
  const config = useMemo(() => {
    const defaults = structuredClone(DEFAULT_TIMELINE_CONFIG);
    // Handle potentially nested old config structure gracefully
    const userConfig = module.viewConfig?.viewConfig || module.viewConfig || {};
    return { ...defaults, ...userConfig };
  }, [module.viewConfig]);

  const [hourHeight, setHourHeight] = useState(config.defaultHourHeight);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const isWeeklyAggregated = useMemo(() => dayjs(dateRange[1]).diff(dateRange[0], 'day') > config.WEEKLY_AGGREGATION_THRESHOLD_DAYS, [dateRange, config.WEEKLY_AGGREGATION_THRESHOLD_DAYS]);
  
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

  const dailyViewData = useMemo(() => {
    if (isWeeklyAggregated) return null;
    const start = dayjs(dateRange[0]);
    const end = dayjs(dateRange[1]);
    const diff = end.diff(start, 'day');
    const dateRangeDays = Array.from({ length: diff + 1 }, (_, i) => start.add(i, 'day'));

    const map: Record<string, TaskBlock[]> = {};
    const range: [dayjs.Dayjs, dayjs.Dayjs] = [dayjs(dateRange[0]), dayjs(dateRange[1])];
    dateRangeDays.forEach(day => map[day.format('YYYY-MM-DD')] = []);
    for (const task of timelineTasks) {
      const blocks = splitTaskIntoDayBlocks(task, range);
      for (const block of blocks) {
        if (map[block.day]) {
          map[block.day].push(block);
        }
      }
    }
    return { dateRangeDays, blocksByDay: map };
  }, [isWeeklyAggregated, timelineTasks, dateRange]);
  
  const weeklyViewData = useMemo(() => {
    if (!isWeeklyAggregated) return null;
    let current = dayjs(dateRange[0]).startOf('isoWeek');
    const end = dayjs(dateRange[1]).endOf('isoWeek');
    const weeks = [];
    while (current.isBefore(end)) {
        weeks.push({ start: current, end: current.endOf('isoWeek'), title: `${current.format('MM/DD')}` });
        current = current.add(1, 'week');
    }

    return weeks.map(week => {
        const categoryHours: Record<string, number> = {};
        let totalHoursInWeek = 0;
        timelineTasks.forEach(task => {
            const taskStart = dayjs(task.startISO);
            const taskEnd = dayjs(task.endISO || task.startISO);
            const overlapStart = dayjs.max(taskStart, week.start)!;
            const overlapEnd = dayjs.min(taskEnd, week.end)!;

            if (overlapStart.isBefore(overlapEnd)) {
                const category = mapTaskToCategory(task.fileName, config.categories);
                const durationHours = task.duration / 60;
                categoryHours[category] = (categoryHours[category] || 0) + durationHours;
                totalHoursInWeek += durationHours;
            }
        });
        return { week, categoryHours, totalHours: totalHoursInWeek };
    });
  }, [isWeeklyAggregated, timelineTasks, dateRange, config.categories]);

  useEffect(() => {
    if (isWeeklyAggregated) return;
    const today = dayjs();
    const isTodayInRange = today.isAfter(dateRange[0]) && today.isBefore(dateRange[1]);
    if (isTodayInRange && timelineContainerRef.current) {
      setTimeout(() => {
        const nowHour = today.hour() + today.minute() / 60;
        const scrollTop = nowHour * hourHeight - 80;  
        timelineContainerRef.current?.scrollTo({ top: scrollTop, behavior: 'smooth' });
      }, 100);
    }
  }, [hourHeight, dateRange, isWeeklyAggregated]);
  
  if (timelineTasks.length === 0) {
    return <div style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '20px' }}>当前范围内没有可供可视化的任务。</div>
  }

  if (isWeeklyAggregated && weeklyViewData) {
    return (
        <div ref={timelineContainerRef} style={{ display: 'flex', overflowX: 'auto', paddingBottom: '10px' }} class="timeline-view-container-weekly">
            {weeklyViewData.map(({ week, categoryHours, totalHours }) => (
                <WeekColumn
                    key={week.start.toString()}
                    week={week}
                    categoryHours={categoryHours}
                    totalHours={totalHours}
                    colorMap={colorMap}
                    order={config.progressOrder}
                />
            ))}
        </div>
    );
  }

  if (!isWeeklyAggregated && dailyViewData) {
    const timeAxis = (
      <div style={{ flex: '0 0 50px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'sticky', top: 0, height: '24px', borderBottom: '1px solid #e5e7eb', zIndex: 3, background: '#f9fafb' }}></div>
        <div style={{ position: 'sticky', top: '24px', minHeight: '80px', borderBottom: '1px solid #e5e7eb', zIndex: 3, background: '#f9fafb' }}></div>  
        <div style={{ position: 'relative' }}>
          {Array.from({ length: config.MAX_HOURS_PER_DAY + 1 }, (_, i) => i).map(h => (
            <div key={h} style={{ height: `${hourHeight}px`, borderBottom: '1px dashed #eee', position: 'relative', boxSizing: 'border-box' }}>
              <span style={{ position: 'absolute', top: '-0.5em', right: '4px', fontSize: '11px', color: '#888' }}>
                {h}:00
              </span>
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <div ref={timelineContainerRef} style={{ display: 'flex', overflowX: 'auto' }} class="timeline-view-container-daily">
        {timeAxis}
        {dailyViewData.dateRangeDays.map(day => {
          const dayStr = day.format('YYYY-MM-DD');
          const blocks = dailyViewData.blocksByDay[dayStr] || [];
          return (
            <DayColumn 
                key={dayStr} 
                day={dayStr} 
                blocks={blocks} 
                hourHeight={hourHeight}
                categoriesConfig={config.categories}
                colorMap={colorMap} 
                maxHours={config.MAX_HOURS_PER_DAY}
                untrackedLabel={config.UNTRACKED_LABEL} 
                progressOrder={config.progressOrder} 
                colorPalette={config.colorPalette}
            />
          );
        })}
      </div>
    );
  }

  return null;
}