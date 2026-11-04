/** @covers F083/regression */
import { buildMonthlyAndWeeklySummary, buildSummaryGoalHours } from '@/core/utils/timelineAggregation';
import type { TimelineTask } from '@/core/types/timeline';

const crossMonth = {
  timelineSource: 'task-session', timelineRange: { start: '2026-10-31T23:30', end: '2026-11-01T00:30' },
  actualStartDate: '2026-10-31', doneDate: '2026-10-31', startMinute: 23 * 60 + 30,
  duration: 60, goalPath: '工作',
} as TimelineTask;

describe('Timeline cross-day aggregation', () => {
  it('splits one session into two monthly and weekly summaries', () => {
    const rows = buildMonthlyAndWeeklySummary([crossMonth], '未跟踪');
    expect(rows.map(row => row.month)).toEqual(['2026-10', '2026-11']);
    expect(rows[0].monthlySummary['工作']).toBeCloseTo(0.5);
    expect(rows[1].monthlySummary['工作']).toBeCloseTo(0.5);
    expect(rows[0].weeklySummaries[4].summary['工作']).toBeCloseTo(0.5);
    expect(rows[1].weeklySummaries[0].summary['工作']).toBeCloseTo(0.5);
  });

  it('includes overlap when session starts outside the viewed date', () => {
    const november1 = new Date('2026-11-01T12:00:00');
    const summary = buildSummaryGoalHours([crossMonth], [november1, november1], '未跟踪');
    expect(summary['工作']).toBeCloseTo(0.5);
    expect(summary['未跟踪']).toBeCloseTo(23.5);
  });

  it('keeps legacy duration-only actual projections without accidentally counting planned points', () => {
    const legacy = {
      ...crossMonth,
      actualStartDate: '2026-11-01', doneDate: '2026-11-01', startMinute: 9 * 60,
      timelineRange: { start: '2026-11-01T09:00' }, duration: 30,
    } as TimelineTask;
    const planned = { ...legacy, timelineSource: 'task-plan' as const, duration: 90 };
    const nov1 = new Date('2026-11-01T12:00:00');
    const result = buildSummaryGoalHours([legacy, planned], [nov1, nov1], '未跟踪');
    expect(result['工作']).toBeCloseTo(0.5);
    expect(result['未跟踪']).toBeCloseTo(23.5);
  });
});
