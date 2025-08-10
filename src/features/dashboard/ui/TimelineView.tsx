// src/features/dashboard/ui/TimelineView.tsx
/** @jsxImportSource preact */
import { h, Fragment } from 'preact';
import { useRef, useState, useEffect, useMemo } from 'preact/hooks';
import { Item, DashboardModule } from '@core/domain/schema';
import { makeObsUri } from '@core/utils/obsidian';
import { processItemsToTimelineTasks, splitTaskIntoDayBlocks, TaskBlock } from '../views/timeline/timeline-parser';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

// --- 默认配置，当 props 中没有提供时作为后备 ---
const DEFAULT_TIMELINE_CONFIG = {
  MIN_HOUR_HEIGHT: 20,
  MAX_HOUR_HEIGHT: 200,
  ZOOM_STEP: 10,
  UNTRACKED_LABEL: "未记录",
  MAX_HOURS_PER_DAY: 24,
  WEEKLY_AGGREGATION_THRESHOLD_DAYS: 35, // 超过35天，自动切换到周视图
  categoryMap: {},
  colorPalette: ["#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa"],
  progressOrder: [],
  defaultHourHeight: 50,
};

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
const getCategoryColor = (category: string, colorMap: Record<string, string>, colorPalette: string[], untrackedLabel: string) => {
    if (colorMap[category]) return colorMap[category];
    if (category === untrackedLabel) return "#9ca3af"; // 未记录的用灰色
    const usedColors = Object.values(colorMap);
    const availableColors = colorPalette.filter(c => !usedColors.includes(c));
    const color = availableColors.length > 0 ? availableColors[0] : colorPalette[Object.keys(colorMap).length % colorPalette.length];
    colorMap[category] = color;
    return color;
};

// --- 子组件 (每日视图) ---
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
const DayColumn = ({ day, blocks, hourHeight, categoryMap, colorMap, maxHours, untrackedLabel, progressOrder, colorPalette }: any) => {
  const categoryHours = useMemo(() => {
    const hours: Record<string, number> = {};
    blocks.forEach((block: TaskBlock) => {
      const category = categoryMap[block.fileName] || block.fileName;
      hours[category] = (hours[category] || 0) + block.duration / 60;
    });
    return hours;
  }, [blocks, categoryMap]);
  
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
          const category = categoryMap[block.fileName] || block.fileName;
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

// --- 子组件 (每周聚合视图) ---
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
  module: DashboardModule;
}

export function TimelineView({ items, dateRange, module }: TimelineViewProps) {
  // 1. 从 props 中安全地获取配置
  const config = useMemo(() => ({
    ...DEFAULT_TIMELINE_CONFIG,
    ...(module.viewConfig || {})
  }), [module.viewConfig]);

  const [hourHeight, setHourHeight] = useState(config.defaultHourHeight);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // 2. 决定使用哪种视图模式
  const isWeeklyAggregated = useMemo(() => 
    dayjs(dateRange[1]).diff(dateRange[0], 'day') > config.WEEKLY_AGGREGATION_THRESHOLD_DAYS,
  [dateRange, config.WEEKLY_AGGREGATION_THRESHOLD_DAYS]);
  
  // 3. 基础数据处理
  const timelineTasks = useMemo(() => processItemsToTimelineTasks(items), [items]);

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    // 确保 order 里的分类优先获得颜色
    config.progressOrder.forEach(category => {
      getCategoryColor(category, map, config.colorPalette, config.UNTRACKED_LABEL);
    });
    Object.values(config.categoryMap).forEach(category => {
      if (!map[category]) {
        getCategoryColor(category, map, config.colorPalette, config.UNTRACKED_LABEL);
      }
    });
    return map;
  }, [config.categoryMap, config.colorPalette, config.progressOrder]);

  // 4. 根据视图模式，进行不同的数据二次处理
  // 4a. 每日视图数据
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
  
  // 4b. 每周聚合视图数据
  const weeklyViewData = useMemo(() => {
    if (!isWeeklyAggregated) return null;
    let current = dayjs(dateRange[0]).startOf('isoWeek');
    const end = dayjs(dateRange[1]).endOf('isoWeek');
    const weeks = [];
    while (current.isBefore(end)) {
      weeks.push({
        start: current,
        end: current.endOf('isoWeek'),
        title: `${current.format('MM/DD')}`
      });
      current = current.add(1, 'week');
    }

    const aggregatedData = weeks.map(week => {
      const categoryHours: Record<string, number> = {};
      timelineTasks.forEach(task => {
        const taskStart = dayjs(task.start);
        const taskEnd = dayjs(task.end);
        const overlapStart = dayjs.max(taskStart, week.start)!;
        const overlapEnd = dayjs.min(taskEnd, week.end)!;
        if (overlapStart.isBefore(overlapEnd)) {
          const durationInMinutes = overlapEnd.diff(overlapStart, 'minute');
          const category = config.categoryMap[task.fileName] || task.fileName;
          categoryHours[category] = (categoryHours[category] || 0) + durationInMinutes / 60;
        }
      });
      const totalHours = Object.values(categoryHours).reduce((sum, h) => sum + h, 0);
      return { week, categoryHours, totalHours };
    });
    return aggregatedData;
  }, [isWeeklyAggregated, timelineTasks, dateRange, config.categoryMap]);

  // 5. 交互和副作用
  const handleWheel = (e: WheelEvent) => {
    if (isWeeklyAggregated || !e.altKey || !timelineContainerRef.current) return;
    e.preventDefault();
    const container = timelineContainerRef.current;
    const rect = container.getBoundingClientRect();
    const scroll_top = container.scrollTop;
    const mouse_y = e.clientY - rect.top;
    const pointerRatio = (scroll_top + mouse_y) / (config.MAX_HOURS_PER_DAY * hourHeight);
    const delta = e.deltaY > 0 ? -config.ZOOM_STEP : config.ZOOM_STEP;
    const newHourHeight = Math.max(config.MIN_HOUR_HEIGHT, Math.min(config.MAX_HOUR_HEIGHT, hourHeight + delta));
    if (newHourHeight !== hourHeight) {
      setHourHeight(newHourHeight);
      const newScrollTop = pointerRatio * (config.MAX_HOURS_PER_DAY * newHourHeight) - mouse_y;
      requestAnimationFrame(() => container.scrollTop = newScrollTop);
    }
  };
  
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

  useEffect(() => {
    const container = timelineContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [hourHeight, config, isWeeklyAggregated]);

  // 6. 渲染
  if (timelineTasks.length === 0) {
    return <div class="view-empty-state">当前范围内没有可供可视化的任务。请确保任务已完成、有完成日期，并包含 `(时间:: HH:mm)` 和 `(时长:: mm)` 格式的元数据。</div>
  }

  // 6a. 渲染周视图
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

  // 6b. 渲染日视图
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
      <div ref={timelineContainerRef} style={{ display: 'flex', maxHeight: '1050px', overflow: 'auto' }} class="timeline-view-container-daily">
        {timeAxis}
        {dailyViewData.dateRangeDays.map(day => {
          const dayStr = day.format('YYYY-MM-DD');
          return (
            <DayColumn key={dayStr} day={dayStr} blocks={dailyViewData.blocksByDay[dayStr] || []} hourHeight={hourHeight}
              categoryMap={config.categoryMap} colorMap={colorMap} maxHours={config.MAX_HOURS_PER_DAY}
              untrackedLabel={config.UNTRACKED_LABEL} progressOrder={config.progressOrder} colorPalette={config.colorPalette}
            />
          );
        })}
      </div>
    );
  }

  return null; // Fallback
}