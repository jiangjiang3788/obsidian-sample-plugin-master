/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F052/unit
 */
import {
  deriveDurationFromRange,
  deriveEndFromStartAndDuration,
  deriveStartFromEndAndDuration,
  applyTaskTimePolicy,
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

  it('applies backward policy as end minus duration for canonical datetime values', () => {
    expect(applyTaskTimePolicy({
      endTime: '2026-08-26T01:45',
      duration: 30,
      direction: 'backward',
      mode: 'finalize',
    })).toEqual({
      startTime: '2026-08-26T01:15',
      endTime: '2026-08-26T01:45',
      duration: 30,
    });
  });

  it('keeps end authoritative when duration changes in backward interactive mode', () => {
    expect(applyTaskTimePolicy({
      startTime: '2026-08-26T01:00',
      endTime: '2026-08-26T01:45',
      duration: 30,
      direction: 'backward',
      lastChanged: 'duration',
      mode: 'interactive',
    })).toEqual({
      startTime: '2026-08-26T01:15',
      endTime: '2026-08-26T01:45',
      duration: 30,
    });
  });

});
