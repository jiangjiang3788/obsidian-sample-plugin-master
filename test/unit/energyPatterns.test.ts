import type { Item } from '@core/types/public';
import { buildEnergyPatterns } from '@core/energy/public';

function energy(id: string, date: string, time: string, score: number, brainScore?: number, physicalScore?: number): Item {
  return {
    id,
    title: 'energy',
    content: '',
    type: 'block',
    tags: [],
    goalPath: '生活',
    date,
    startTime: time,
    coreBlock: 'energy',
    categoryKey: '精力',
    recurrence: '',
    created: 0,
    modified: 0,
    extra: {
      核心Block: 'energy',
      日期: date,
      时间: time,
      精力值: score,
      精力档位: Math.max(20, Math.round(score / 20) * 20),
      ...(brainScore != null ? { 脑力精力: brainScore } : {}),
      ...(physicalScore != null ? { 体力精力: physicalScore } : {}),
    },
  } as Item;
}

function task(id: string, date: string, startTime: string, endTime: string, duration: number): Item {
  return {
    id,
    title: '写代码',
    content: '',
    type: 'task',
    tags: [],
    goalPath: '生活',
    date,
    startTime,
    endTime,
    duration,
    coreBlock: 'task',
    categoryKey: '任务',
    recurrence: '',
    created: 0,
    modified: 0,
    extra: {},
  } as Item;
}

describe('buildEnergyPatterns', () => {
  it('builds daypart, lag, continuous-session and high-energy continuation observations', () => {
    const items: Item[] = [
      energy('e1', '2026-08-08', '08:00', 80, 85, 75),
      task('t1', '2026-08-08', '08:15', '09:15', 60),
      task('t2', '2026-08-08', '09:25', '10:25', 60),
      energy('e2', '2026-08-08', '10:35', 40, 35, 45),
      energy('e3', '2026-08-08', '14:05', 60, 60, 60),
      energy('e4', '2026-08-08', '20:00', 50, 45, 55),
      energy('e5', '2026-08-09', '08:05', 70, 70, 70),
    ];
    const result = buildEnergyPatterns(items, { analysisWindowDays: 30 });
    expect(result).not.toBeNull();
    expect(result?.dayparts.find((row) => row.key === 'morning')?.sampleCount).toBeGreaterThan(0);
    expect(result?.lag.find((row) => row.key === '6h')?.sampleCount).toBeGreaterThan(0);
    expect(result?.continuousSessionCount).toBe(1);
    expect(result?.continuousWork.find((row) => row.key === 'ge120')?.pairedSessionCount).toBe(1);
    expect(result?.stopProxy.highEnergySampleCount).toBe(1);
    expect(result?.stopProxy.followedByWorkCount).toBe(1);
    expect(result?.stopProxy.longContinuationCount).toBe(1);
  });

  it('keeps missing lag targets missing instead of fabricating interpolation', () => {
    const result = buildEnergyPatterns([
      energy('e1', '2026-08-08', '08:00', 80),
      energy('e2', '2026-08-10', '08:00', 60),
    ]);
    expect(result?.lag.find((row) => row.key === '6h')?.sampleCount).toBe(0);
    expect(result?.lag.find((row) => row.key === '12h')?.sampleCount).toBe(0);
    expect(result?.lag.find((row) => row.key === '24h')?.sampleCount).toBe(0);
  });
});
