import {
  buildEventTimelineGroupedTree,
  buildEventTimelineRenderModel,
  buildEventTimelineViewConfig,
  cleanEventTimelineDisplayText,
  filterEventTimelineItemsByDateRange,
  getEventTimelineTaskDisplayTitle,
} from '@/features/settings/views/runtime/EventTimelineView/EventTimelineViewModel';

const task = (id: string, date: string, content = '') => ({
  id,
  title: `任务${id}`,
  fields: { date, content, title: `字段标题${id}`, category: '工作' },
});

describe('EventTimelineViewModel', () => {
  it('normalizes view config and display text', () => {
    expect(buildEventTimelineViewConfig({ viewConfig: { timeField: 'doneDate', maxContentLength: '4' } } as any)).toEqual({
      timeField: 'doneDate',
      titleField: 'title',
      contentField: 'content',
      maxContentLength: 4,
    });
    expect(cleanEventTimelineDisplayText('  abc\n  def  ', 5)).toBe('abc d...');
    expect(cleanEventTimelineDisplayText('abcdef', 0)).toBe('abcdef');
  });

  it('filters and sorts items by configured time field', () => {
    const items = [task('2', '2026-06-02T10:00:00'), task('1', '2026-06-01T10:00:00'), task('3', '2026-07-01T10:00:00')] as any[];
    const result = filterEventTimelineItemsByDateRange({
      items,
      dateRange: [new Date('2026-06-01T00:00:00'), new Date('2026-06-30T23:59:59')],
      timeField: 'date',
    });
    expect(result.map((item) => item.id)).toEqual(['1', '2']);
    expect(filterEventTimelineItemsByDateRange({ items, dateRange: [new Date(), new Date()], timeField: 'date', injectedFilteredItems: [items[2]] }).map((item) => item.id)).toEqual(['3']);
  });

  it('builds grouped tree and render model with injected tree precedence', () => {
    const items = [task('1', '2026-06-01T10:00:00')] as any[];
    expect(buildEventTimelineGroupedTree({ filteredItems: items, groupFields: [] })).toBeNull();
    expect(buildEventTimelineGroupedTree({ filteredItems: items, groupFields: ['category'] })?.[0]?.label).toBe('工作');
    expect(buildEventTimelineGroupedTree({ filteredItems: items, groupFields: ['category'], injectedGroupedTree: null })).toBeNull();

    const model = buildEventTimelineRenderModel({
      items,
      dateRange: [new Date('2026-06-01T00:00:00'), new Date('2026-06-01T23:59:59')],
      module: { fields: ['title'], groupFields: ['category'], viewConfig: { maxContentLength: 20 } } as any,
    });
    expect(model.filteredItems).toHaveLength(1);
    expect(model.groupedTree?.[0]?.label).toBe('工作');
    expect(model.displayFields).toEqual(['title']);
  });

  it('derives task display title from content then fallback title', () => {
    const withContent = task('1', '2026-06-01T10:00:00', '正文标题') as any;
    const withoutContent = task('2', '2026-06-01T10:00:00') as any;
    expect(getEventTimelineTaskDisplayTitle({ item: withContent, titleField: 'title', contentField: 'content', maxContentLength: 20 })).toBe('正文标题');
    expect(getEventTimelineTaskDisplayTitle({ item: withoutContent, titleField: 'title', contentField: 'content', maxContentLength: 20 })).toBe('字段标题2');
  });
});
