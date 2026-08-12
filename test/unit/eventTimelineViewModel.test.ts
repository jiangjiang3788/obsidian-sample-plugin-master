import {
  buildEventTimelineGroupedTree,
  buildEventTimelineRenderModel,
  buildEventTimelineViewConfig,
  cleanEventTimelineDisplayText,
  filterEventTimelineItemsByDateRange,
  getEventTimelineTaskDisplayTitle,
} from '@/features/views/runtime/EventTimelineView/EventTimelineViewModel';
import type { RecordViewItem, ViewInstance } from '@core/public';

const task = (id: string, date: string, content = '') => ({
  id,
  title: `任务${id}`,
  fields: { date, content, title: `字段标题${id}`, category: '工作' },
});
function recordItem(overrides: Partial<RecordViewItem> = {}): RecordViewItem {
  return {
    id: 'task.01J00000000000000000000001', title: '标题', content: '干净内容',
    fullData: '<!-- start -->\n记录ID:: task.01J00000000000000000000001\n记录版本:: 2\n核心Block:: task\n状态:: open\n内容:: 干净内容\n<!-- end -->',
    rawSource: '<!-- start -->\n记录ID:: task.01J00000000000000000000001\n记录版本:: 2\n核心Block:: task\n状态:: open\n内容:: 干净内容\n<!-- end -->',
    tags: [], categoryKey: '任务', coreBlock: 'task', status: 'open', date: '2026-06-04T09:00:00', created: 1, modified: 2, extra: {}, ...overrides,
  } as RecordViewItem;
}
function moduleConfig(viewConfig: Record<string, any> = {}): ViewInstance {
  return { id: 'view-1', title: '事件时间线', viewType: 'EventTimelineView', fields: ['title','content'], groupFields: [], filters: [], sort: [], collapsed: false, viewConfig } as ViewInstance;
}

describe('EventTimelineViewModel', () => {
  it('normalizes view config and display text', () => {
    expect(buildEventTimelineViewConfig({ viewConfig: { timeField: 'doneDate', maxContentLength: '4' } } as any)).toEqual({ timeField: 'doneDate', titleField: 'title', contentField: 'content', maxContentLength: 4 });
    expect(cleanEventTimelineDisplayText('  abc\n  def  ', 5)).toBe('abc d...');
    expect(cleanEventTimelineDisplayText('abcdef', 0)).toBe('abcdef');
  });
  it('filters and sorts items by configured time field', () => {
    const items = [task('2','2026-06-02T10:00:00'),task('1','2026-06-01T10:00:00'),task('3','2026-07-01T10:00:00')] as any[];
    const result = filterEventTimelineItemsByDateRange({ items, dateRange: [new Date('2026-06-01T00:00:00'), new Date('2026-06-30T23:59:59')], timeField: 'date' });
    expect(result.map((item) => item.id)).toEqual(['1','2']);
    expect(filterEventTimelineItemsByDateRange({ items, dateRange: [new Date(),new Date()], timeField: 'date', injectedFilteredItems: [items[2]] }).map((item) => item.id)).toEqual(['3']);
  });
  it('builds grouped tree and render model', () => {
    const items=[task('1','2026-06-01T10:00:00')] as any[];
    expect(buildEventTimelineGroupedTree({ filteredItems: items, groupFields: [] })).toBeNull();
    expect(buildEventTimelineGroupedTree({ filteredItems: items, groupFields: ['category'] })?.[0]?.label).toBe('工作');
    const model=buildEventTimelineRenderModel({ items, dateRange:[new Date('2026-06-01T00:00:00'),new Date('2026-06-01T23:59:59')], module:{ fields:['title'], groupFields:['category'], viewConfig:{ maxContentLength:20 } } as any });
    expect(model.filteredItems).toHaveLength(1); expect(model.groupedTree?.[0]?.label).toBe('工作'); expect(model.displayFields).toEqual(['title']);
  });
  it('derives task display title from content then fallback title', () => {
    expect(getEventTimelineTaskDisplayTitle({ item: task('1','2026-06-01T10:00:00','正文标题') as any, titleField:'title', contentField:'content', maxContentLength:20 })).toBe('正文标题');
    expect(getEventTimelineTaskDisplayTitle({ item: task('2','2026-06-01T10:00:00') as any, titleField:'title', contentField:'content', maxContentLength:20 })).toBe('字段标题2');
  });
  it('defaults content to clean content and permits fullData debugging', () => {
    const range=[new Date('2026-06-04T00:00:00'),new Date('2026-06-05T00:00:00')] as [Date,Date];
    const normal=buildEventTimelineRenderModel({ items:[recordItem()], module:moduleConfig(), dateRange:range });
    expect(normal.contentField).toBe('content'); expect(normal.filteredItems).toHaveLength(1);
    expect(buildEventTimelineRenderModel({ items:[recordItem()], module:moduleConfig({contentField:'fullData'}), dateRange:range }).contentField).toBe('fullData');
  });
});
