/** @jsxImportSource preact */
// src/shared/ui/views/timeline/EventTimelineViewView.tsx
import { h } from 'preact';
import type { Item } from '@core/public';
import type { GroupNode } from '@core/public';
import { readField } from '@core/public';
import type { TimerController } from '@/app/public';
import type { MarkDoneHandler } from '@shared/types/actions';

import { TaskRow } from '@shared/ui/items/TaskRow';
import { BlockItem } from '@shared/ui/items/BlockItem';
import { GroupedContainer } from '@shared/ui/GroupedContainer';

interface EventTimelineViewViewProps {
  filteredItems: Item[];
  groupedTree: GroupNode[] | null;

  app: any;

  /** BlockItem 需要展示的字段 */
  displayFields: string[];

  /** 读取 item 时间（由 container 统一实现 timeField + parse） */
  getItemTime: (item: Item) => any | null;

  /** key / 标题展示优先字段 */
  titleField: string;

  onMarkDone?: MarkDoneHandler;
  timerService: TimerController;
  timers: any[];
  allThemes: any[];
}

export function EventTimelineViewView(props: EventTimelineViewViewProps) {
  const {
    filteredItems,
    groupedTree,
    app,
    displayFields,
    getItemTime,
    titleField,
    onMarkDone,
    timerService,
    timers,
    allThemes,
  } = props;

  if (filteredItems.length === 0) {
    return <div class="event-timeline-empty">当前时间范围内没有事件记录。</div>;
  }

  // 渲染事件列表，处理日期去重
  const renderEventList = (items: Item[]) => {
    let lastDate = '';

    return items.map((item, index) => {
      const t = getItemTime(item);
      const dateLabel = t ? t.format('YYYY-MM-DD') : '';
      const timeLabel = t ? t.format('HH:mm') : '';

      // 日期去重：相同日期只在第一个显示
      const showDate = dateLabel !== lastDate;
      if (showDate) lastDate = dateLabel;

      const titleForKey =
        (readField(item, titleField) as string) || (readField(item, 'title') as string) || '';

      return (
        <div class="et-event" key={`${dateLabel}-${timeLabel}-${titleForKey}-${index}`}>
          {/* 左侧：日期和时间 */}
          <div class="et-event-date">
            {showDate && t && <div class="et-date-label">{dateLabel}</div>}
            {/* task类型显示时间，block类型不显示时间 */}
            {item.type === 'task' && <div class="et-time-label">{timeLabel}</div>}
          </div>

          {/* 中间：时间线 */}
          <div class="et-line">
            <div class="et-dot" />
          </div>

          {/* 右侧：内容卡片 */}
          <div class="et-event-card">
            {item.type === 'task' ? (
              <TaskRow
                item={item}
                onMarkDone={(id: string) => onMarkDone?.(id)}
                app={app}
                timerService={timerService}
                timer={timers.find((t) => t.taskId === item.id)}
                allThemes={allThemes}
                showFields={[]} // TaskRow 不显示额外字段
              />
            ) : (
              <BlockItem item={item} fields={displayFields} isNarrow={false} app={app} allThemes={allThemes} />
            )}
          </div>
        </div>
      );
    });
  };

  if (!groupedTree) {
    // 无分组：保持原有结构，使用 .event-timeline-view + .et-ungrouped
    return (
      <div class="event-timeline-view">
        <div class="et-ungrouped">{renderEventList(filteredItems)}</div>
      </div>
    );
  }

  // 有分组：使用通用 GroupedContainer 统一分组层级逻辑 + 折叠交互
  return (
    <GroupedContainer
      nodes={groupedTree}
      classNames={{
        root: 'event-timeline-view',
        group: 'et-group',
        title: 'et-group-title',
        content: 'et-group-content',
        toggleIcon: 'et-group-toggle-icon',
        label: 'et-group-label',
      }}
      renderLeaf={(leafItems) => renderEventList(leafItems)}
    />
  );
}
