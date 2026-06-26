import {
  buildTimelineDayColumns,
  buildTimelineTimeAxisRows,
} from '@/shared/ui/views/TimelineView/TimelineDailyViewModel';

describe('TimelineDailyViewModel', () => {
  it('builds day columns with empty block fallback', () => {
    const day = { format: () => '2026-06-01' };
    expect(buildTimelineDayColumns({
      dateRangeDays: [day],
      blocksByDay: {},
    } as any)).toEqual([{ day: '2026-06-01', blocks: [] }]);
  });

  it('builds even-hour labels for the time axis', () => {
    expect(buildTimelineTimeAxisRows(4, 24)).toEqual([
      { hour: 0, label: '', height: '24px' },
      { hour: 1, label: '', height: '24px' },
      { hour: 2, label: '2:00', height: '24px' },
      { hour: 3, label: '', height: '24px' },
      { hour: 4, label: '4:00', height: '24px' },
    ]);
  });
});
