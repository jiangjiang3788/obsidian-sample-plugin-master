// src/features/dashboard/views/timeline/TimelineView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { Item, ModuleConfig } from '@core/domain/schema';
import { dayjs } from '@core/utils/date';

import {
  processItemsToTimelineTasks,
  splitTaskIntoDayBlocks,
  calculateCategoryHours,
  TaskBlock,
} from './timeline-parser';

import './TimelineView.css';

// 【关键修改】这里的默认配置现在是一个最小化的、用于安全回退的配置。
// 权威的默认配置已经移至 DashboardConfigForm.tsx
const FALLBACK_VIEW_CONFIG = {
  hourHeight: 50,
  startHour: 7,
  endHour: 24,
  categories: {}, // 默认为空，依赖从 props 传入的配置
};

interface Props {
  items: Item[];
  module: ModuleConfig;
  dateRange: [Date, Date];
}

export function TimelineView({ items, module, dateRange }: Props) {
  // 合并回退配置和用户通过 props 传入的配置
  const viewConfig = useMemo(() => ({
    ...FALLBACK_VIEW_CONFIG,
    ...(module.viewConfig || {}),
    // 确保 categories 也是深度合并，防止只定义 hourHeight 等属性时丢失默认 categories
    categories: {
      ...(FALLBACK_VIEW_CONFIG.categories),
      ...(module.viewConfig?.categories || {}),
    }
  }), [module.viewConfig]);

  const { hourHeight, startHour, endHour, categories } = viewConfig;

  const range: [dayjs.Dayjs, dayjs.Dayjs] = [dayjs(dateRange[0]), dayjs(dateRange[1])];

  const timelineTasks = useMemo(() => processItemsToTimelineTasks(items), [items]);

  const dayBlocks = useMemo(() => {
    return timelineTasks.flatMap(task => splitTaskIntoDayBlocks(task, range));
  }, [timelineTasks, range]);
  
  const blocksByDay = useMemo(() => {
    return dayBlocks.reduce((acc, block) => {
      if (!acc[block.day]) {
        acc[block.day] = [];
      }
      acc[block.day].push(block);
      return acc;
    }, {} as Record<string, TaskBlock[]>);
  }, [dayBlocks]);

  const categoryHours = useMemo(() => {
    // 确保 categories 是一个对象，避免在配置不存在时出错
    return calculateCategoryHours(dayBlocks, categories || {});
  }, [dayBlocks, categories]);

  if (timelineTasks.length === 0) {
    return <div class="view-empty-state">当前范围内没有可供可视化的任务...</div>;
  }

  const days = [];
  let currentDate = range[0].clone();
  while (currentDate.isBefore(range[1]) || currentDate.isSame(range[1], 'day')) {
    days.push(currentDate.format('YYYY-MM-DD'));
    currentDate = currentDate.add(1, 'day');
  }

  const totalHours = endHour - startHour;
  const timeLabels = Array.from({ length: totalHours + 1 }, (_, i) => startHour + i);

  // --- 渲染逻辑 (无变化) ---
  const renderTimeAxis = () => (
    <div class="timeline-axis-container" style={{ gridRow: 1 }}>
      {timeLabels.map(hour => (
        <div class="timeline-time-label" style={{ height: `${hourHeight}px` }}>
          {`${hour.toString().padStart(2, '0')}:00`}
        </div>
      ))}
    </div>
  );

  const renderDayColumn = (day: string) => (
    <div class="timeline-day-column" key={day}>
      <div class="timeline-day-header">
        {dayjs(day).format('MM-DD')}
        <span class="timeline-day-weekday">{['日', '一', '二', '三', '四', '五', '六'][dayjs(day).day()]}</span>
      </div>
      <div class="timeline-day-grid" style={{ height: `${totalHours * hourHeight}px` }}>
        {(blocksByDay[day] || []).map(renderTaskBlock)}
      </div>
    </div>
  );

  const renderTaskBlock = (block: TaskBlock) => {
    const top = ((block.blockStartMinute / 60) - startHour) * hourHeight;
    const height = ((block.blockEndMinute - block.blockStartMinute) / 60) * hourHeight;

    const categoryConfig = categories || {};
    const categoryEntry = Object.values(categoryConfig).find(cat =>
      cat.files.some((prefix: string) => block.file?.path?.includes(prefix))
    );
    const color = categoryEntry ? categoryEntry.color : '#a1a1aa'; // 默认颜色

    return (
      <div
        class="timeline-task-block"
        style={{ top: `${top}px`, height: `${height}px`, backgroundColor: color }}
        title={`${block.pureText}\n时间: ${dayjs().startOf('day').add(block.startMinute, 'minute').format('HH:mm')} - ${dayjs().startOf('day').add(block.endMinute, 'minute').format('HH:mm')}`}
      >
        <div class="timeline-task-block-text">{block.pureText}</div>
      </div>
    );
  };
  
  const renderCategoryStats = () => {
    const totalTrackedHours = Object.values(categoryHours).reduce((sum, h) => sum + h, 0);
    if (totalTrackedHours === 0) return null;

    const categoryConfig = categories || {};
    return (
        <div class="timeline-category-stats">
            {Object.entries(categoryHours).map(([category, hours]) => {
                if (hours === 0) return null;
                const config = categoryConfig[category];
                if (!config) return null;

                const percentage = (hours / totalTrackedHours) * 100;

                return (
                    <div class="timeline-category-bar-container" key={category}>
                        <div
                            class="timeline-category-bar"
                            style={{
                                width: `${percentage}%`,
                                backgroundColor: config.color,
                            }}
                        ></div>
                        <div class="timeline-category-label">
                            {category} - {hours.toFixed(1)}h
                        </div>
                    </div>
                );
            })}
        </div>
    );
  };

  return (
    <div class="timeline-view">
      {renderCategoryStats()}
      <div class="timeline-container">
        <div class="timeline-sticky-header">
          {renderTimeAxis()}
        </div>
        <div class="timeline-content">
          <div class="timeline-grid-container" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
            {days.map(renderDayColumn)}
          </div>
        </div>
      </div>
    </div>
  );
}