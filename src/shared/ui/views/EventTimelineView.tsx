/** @jsxImportSource preact */
// src/features/views/EventTimelineView.tsx
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import type { Item, ViewInstance } from '@core/public';
import { readField } from '@core/public';
import { dayjs } from '@core/public';
import type { TimerController } from '@/app/public';
import { groupItemsByFields, type GroupNode } from '@core/public';
import type { MarkDoneHandler } from '@shared/types/actions';

import { EventTimelineViewView } from './timeline/EventTimelineViewView';

interface EventTimelineViewProps {
  items: Item[];
  /**
   * Phase2 渐进：上层（feature/usecase）预先计算好的时间线过滤结果。
   * 如果传入，则视图不再在 shared/ui 内部做过滤/排序。
   */
  filteredItems?: Item[];
  /**
   * Phase2 渐进：上层预先计算好的分组树。
   * - undefined: 未传入，由视图自己计算
   * - null: 明确表示不分组
   */
  groupedTree?: GroupNode[] | null;
  app: any;
  dateRange: [Date, Date];
  module: ViewInstance;
  currentView: '年' | '季' | '月' | '周' | '天';
  onMarkDone?: MarkDoneHandler;
  timerService: TimerController;
  timers: any[];
  allThemes: any[];
}

/**
 * 事件时间线视图：
 * - 纵向线性展示「这段时间发生了哪些事件」
 * - 按配置的字段进行多级分组（如有），组内按时间升序排列
 * - 日期/时间仍然在左侧作为时间线主轴
 */
export function EventTimelineView(props: EventTimelineViewProps) {
  const {
    items,
    filteredItems: injectedFilteredItems,
    groupedTree: injectedGroupedTree,
    app,
    dateRange,
    module,
    onMarkDone,
    timerService,
    timers,
    allThemes,
  } = props;

  // 使用统一配置：优先使用模块级配置
  const displayFields = module.fields || ['title', 'date'];
  const groupFields: string[] = module.groupFields || [];

  // 视图特有配置，fallback 到默认值
  const viewConfig = (module.viewConfig as any) || {};
  const timeField = viewConfig.timeField || 'date';
  const titleField = viewConfig.titleField || 'title';

  const start = useMemo(() => dayjs(dateRange[0]), [dateRange]);
  const end = useMemo(() => dayjs(dateRange[1]), [dateRange]);

  function getItemTime(item: Item) {
    const raw = readField(item, timeField);
    if (!raw) return null;
    try {
      return dayjs(raw);
    } catch {
      return null;
    }
  }

  // 先按时间过滤 + 排序，确保时间线语义正确
  // Phase2 渐进：如果上层已注入 filteredItems，则这里不再重复计算。
  const filteredItems = useMemo(() => {
    if (injectedFilteredItems !== undefined) return injectedFilteredItems;

    const result: Item[] = [];

    for (const item of items) {
      const t = getItemTime(item);
      if (!t) continue;
      if (!t.isBetween(start, end, 'minute', '[]')) continue;
      result.push(item);
    }

    return result.sort((a, b) => {
      const ta = getItemTime(a)!;
      const tb = getItemTime(b)!;
      return ta.valueOf() - tb.valueOf();
    });
  }, [items, start, end, timeField, injectedFilteredItems]);

  // 如果配置了分组字段，则按字段进行多级分组；否则仅按时间线顺序展示
  const groupedTree: GroupNode[] | null = useMemo(() => {
    if (injectedGroupedTree !== undefined) return injectedGroupedTree;
    if (!groupFields || groupFields.length === 0) return null;
    return groupItemsByFields(filteredItems, groupFields);
  }, [filteredItems, groupFields, injectedGroupedTree]);

  return (
    <EventTimelineViewView
      filteredItems={filteredItems}
      groupedTree={groupedTree}
      app={app}
      displayFields={displayFields}
      getItemTime={getItemTime}
      titleField={titleField}
      onMarkDone={onMarkDone}
      timerService={timerService}
      timers={timers}
      allThemes={allThemes}
    />
  );
}
