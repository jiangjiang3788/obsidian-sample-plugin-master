import type { EventTimelineViewConfig } from '../types';

export const EVENT_TIMELINE_VIEW_DEFAULT_CONFIG: EventTimelineViewConfig = {
  timeField: 'date',
  titleField: 'title',
  contentField: 'content',
  groupByDay: true,
  showWeekday: true,
  maxContentLength: 160,
  fields: ['title', 'date'],
  groupFields: [],
};
