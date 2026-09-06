/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F092/unit
 */
import {
  clampTimelineBoundaryMinute,
  clampTimelineMinute,
  timelineMinuteFromOffset,
  timelineBoundaryMinuteToLocalDateTime,
  timelineMinuteToLocalDateTime,
  timelineOffsetFromMinute,
  timelineVisibleEndMinute,
} from '@core/utils/public';


describe('Timeline natural-day clock', () => {
  it('uses midnight as the one and only pixel/minute origin', () => {
    expect(timelineMinuteFromOffset(0, 50)).toBe(0);
    expect(timelineOffsetFromMinute(0, 50)).toBe(0);
    expect(timelineMinuteFromOffset(100, 50)).toBe(120);
    expect(timelineOffsetFromMinute(120, 50)).toBe(100);
  });

  it('keeps the visible day inside 00:00..23:59', () => {
    expect(timelineVisibleEndMinute(24)).toBe(1440);
    expect(clampTimelineMinute(-1)).toBe(0);
    expect(clampTimelineMinute(1440)).toBe(1439);
    expect(clampTimelineBoundaryMinute(1440)).toBe(1440);
    expect(timelineMinuteToLocalDateTime('2026-08-26', 0)).toBe('2026-08-26T00:00');
    expect(timelineMinuteToLocalDateTime('2026-08-26', 1439)).toBe('2026-08-26T23:59');
    expect(timelineBoundaryMinuteToLocalDateTime('2026-08-26', 1440)).toBe('2026-08-27T00:00');
    expect(timelineMinuteFromOffset(9999, 50, 12)).toBe(719);
  });
});
