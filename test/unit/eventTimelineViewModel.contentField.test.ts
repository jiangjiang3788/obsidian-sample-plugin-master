import { buildEventTimelineViewModel } from '@/features/settings/views/models/eventTimelineViewModel';
import type { Item, ViewInstance } from '@core/public';

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: 'task.01J00000000000000000000001',
    title: '标题',
    content: '干净内容',
    fullData: '<!-- start -->\n记录ID:: task.01J00000000000000000000001\n记录版本:: 2\n核心Block:: task\n状态:: open\n内容:: 干净内容\n<!-- end -->',
    rawSource: '<!-- start -->\n记录ID:: task.01J00000000000000000000001\n记录版本:: 2\n核心Block:: task\n状态:: open\n内容:: 干净内容\n<!-- end -->',
    tags: [],
    categoryKey: '任务',
    coreBlock: 'task',
    status: 'open',
    date: '2026-06-04T09:00:00',
    created: 1,
    modified: 2,
    extra: {},
    ...overrides,
  } as Item;
}

function module(viewConfig: Record<string, any> = {}): ViewInstance {
  return {
    id: 'view-1',
    title: '事件时间线',
    viewType: 'EventTimelineView',
    fields: ['title', 'content'],
    groupFields: [],
    filters: [],
    sort: [],
    collapsed: false,
    viewConfig,
  } as ViewInstance;
}

describe('EventTimelineViewModel content field config', () => {
  it('defaults contentField to content', () => {
    const model = buildEventTimelineViewModel({
      items: [item()],
      module: module(),
      dateRange: [new Date('2026-06-04T00:00:00'), new Date('2026-06-05T00:00:00')],
    });

    expect(model.contentField).toBe('content');
    expect(model.filteredItems).toHaveLength(1);
  });

  it('allows switching contentField to fullData for debugging raw markdown', () => {
    const model = buildEventTimelineViewModel({
      items: [item()],
      module: module({ contentField: 'fullData' }),
      dateRange: [new Date('2026-06-04T00:00:00'), new Date('2026-06-05T00:00:00')],
    });

    expect(model.contentField).toBe('fullData');
  });
});
