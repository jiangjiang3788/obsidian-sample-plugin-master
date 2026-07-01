// src/features/settings/viewModels/eventTimelineViewModel.ts
/**
 * EventTimelineView model builder (Phase2: shared/ui 纯化试点)
 *
 * 目标：把「过滤/排序/分组」等业务计算从 shared/ui/views/EventTimelineView.tsx
 * 挪到 feature 层，让 shared/ui 更接近“纯渲染”。
 *
 * 说明：这里仍然只做“位置迁移”，不改变视图行为。
 */

import { dayjs, groupItemsByFields } from '@core/utils/public';
import { readField } from '@core/types/public';
import { normalizeDisplayFields } from '@core/view/public';
import type { Item, ViewInstance } from '@core/types/public';
import type { GroupNode } from '@core/utils/public';
import type { GoalDefinition } from '@core/goal/public';

export interface EventTimelineViewModel {
  displayFields: string[];
  groupFields: string[];
  timeField: string;
  titleField: string;
  contentField: string;
  maxContentLength: number;
  filteredItems: Item[];
  groupedTree: GroupNode[] | null;
}

export function buildEventTimelineViewModel(params: {
  items: Item[];
  module: ViewInstance;
  dateRange: [Date, Date];
  goals?: GoalDefinition[];
}): EventTimelineViewModel {
  const { items, module, dateRange, goals = [] } = params;

  const displayFields = normalizeDisplayFields(module.fields || ['title', 'date'], { fallbackFields: ['title', 'date'] });
  const groupFields: string[] = normalizeDisplayFields(module.groupFields || []);

  const viewConfig = (module.viewConfig as any) || {};
  const timeField = viewConfig.timeField || 'date';
  const titleField = viewConfig.titleField || 'title';
  const contentField = viewConfig.contentField || 'content';
  const maxContentLength = viewConfig.maxContentLength ?? 160;

  const start = dayjs(dateRange[0]);
  const end = dayjs(dateRange[1]);

  const getItemTime = (item: Item) => {
    const raw = readField(item, timeField);
    if (!raw) return null;
    try {
      return dayjs(raw);
    } catch {
      return null;
    }
  };

  // 先按时间过滤 + 排序，确保时间线语义正确
  const filteredItems = (() => {
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
  })();

  const groupedTree: GroupNode[] | null = groupFields.length
    ? groupItemsByFields(filteredItems, groupFields, { goals })
    : null;

  return {
    displayFields,
    groupFields,
    timeField,
    titleField,
    contentField,
    maxContentLength,
    filteredItems,
    groupedTree,
  };
}
