import { buildEnergyPeriod } from '@core/energy/public';
import type { Item } from '@core/types/public';

function energy(id: string, date: string, time: string, score: number, brain?: number, physical?: number): Item {
  return {
    id,
    title: 'energy',
    content: '',
    type: 'block',
    tags: [],
    categoryKey: '精力',
    recurrence: '',
    created: 0,
    modified: 0,
    coreBlock: 'energy',
    date,
    startTime: time,
    extra: {
      精力值: score,
      ...(brain == null ? {} : { 脑力精力: brain }),
      ...(physical == null ? {} : { 体力精力: physical }),
    },
  };
}

describe('Energy period projection', () => {
  const items = [
    energy('a', '2026-08-04', '09:00', 20, 30, 10),
    energy('b', '2026-08-04', '15:00', 80, 70, 90),
    energy('c', '2026-08-05', '12:00', 60, 50, 70),
  ];

  it('uses a horizontal time mode for day view', () => {
    const result = buildEnergyPeriod(items, { currentView: '天', startDate: '2026-08-04', endDate: '2026-08-04' });
    expect(result?.mode).toBe('day-horizontal');
    expect(result?.days[0].samples.map((row) => row.time)).toEqual(['09:00', '15:00']);
  });

  it('uses date x time for week/month and preserves missing days', () => {
    const result = buildEnergyPeriod(items, { currentView: '周', startDate: '2026-08-04', endDate: '2026-08-10' });
    expect(result?.mode).toBe('date-time');
    expect(result?.sampledDays).toBe(2);
    expect(result?.missingDays).toBe(5);
  });

  it('collapses quarter/year to one equal-weight daily point without inventing missing values', () => {
    const result = buildEnergyPeriod(items, { currentView: '季', startDate: '2026-08-04', endDate: '2026-08-06' });
    expect(result?.mode).toBe('daily-dots');
    expect(result?.days[0].dailyScore).toBe(50);
    expect(result?.days[0].dailyBrainScore).toBe(50);
    expect(result?.days[0].dailyPhysicalScore).toBe(50);
    expect(result?.days[2].sampled).toBe(false);
    expect(result?.days[2].dailyScore).toBeUndefined();
  });
});
