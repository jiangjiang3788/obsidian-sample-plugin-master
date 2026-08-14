import {
  deriveDurationFromRange,
  deriveEndFromStartAndDuration,
  deriveStartFromEndAndDuration,
} from '../../src/core/records/task/taskTime';

describe('task datetime duration policy', () => {
  it('calculates cross-day datetime duration without 24h guessing', () => {
    expect(deriveDurationFromRange('2026-08-13T23:40', '2026-08-14T07:20')).toBe(460);
  });

  it('derives a cross-day end datetime from duration', () => {
    expect(deriveEndFromStartAndDuration('2026-08-13T23:40', 460)).toBe('2026-08-14T07:20');
  });

  it('derives a cross-day start datetime from duration', () => {
    expect(deriveStartFromEndAndDuration('2026-08-14T07:20', 460)).toBe('2026-08-13T23:40');
  });

  it('keeps legacy HH:mm overnight behavior', () => {
    expect(deriveDurationFromRange('23:40', '07:20')).toBe(460);
  });
});
