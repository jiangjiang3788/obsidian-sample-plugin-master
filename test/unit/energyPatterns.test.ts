import type { Item } from '@core/types/public';
import { buildEnergyPatterns } from '@core/energy/public';

function base(overrides: Partial<Item>): Item {
  return { id: 'item', title: '', content: '', tags: [], categoryKey: '', created: 0, modified: 0, extra: {}, ...overrides } as Item;
}

function energy(id: string, date: string, time: string, score: number, brainScore?: number, physicalScore?: number): Item {
  return base({
    id, title: 'energy', goalPath: '生活', date, startTime: time, coreBlock: 'energy', categoryKey: '精力',
    extra: { 核心Block: 'energy', 日期: date, 时间: time, 精力值: score, 精力档位: Math.max(20, Math.round(score / 20) * 20), ...(brainScore != null ? { 脑力精力: brainScore } : {}), ...(physicalScore != null ? { 体力精力: physicalScore } : {}) },
  });
}

function task(id: string): Item {
  return base({ id, title: '写代码', content: '写代码', goalPath: '生活', coreBlock: 'task', status: 'open', themePath: '工作/开发' });
}

function session(id: string, taskId: string, date: string, start: string, end: string, duration: number, beforeId?: string, afterId?: string): Item {
  return base({ id, coreBlock: 'task-session', taskId, sessionStartedAt: `${date}T${start}:00`, sessionEndedAt: `${date}T${end}:00`, sessionDurationMinutes: duration, sessionResult: 'work-block-ended', sessionSource: 'timer', startEnergyRecordId: beforeId, endEnergyRecordId: afterId });
}

describe('buildEnergyPatterns', () => {
  it('builds daypart, lag, continuous-session and high-energy continuation observations from TaskSession facts', () => {
    const t1 = task('t1');
    const t2 = task('t2');
    const records: Item[] = [
      energy('e1', '2026-08-08', '08:00', 80, 85, 75),
      t1,
      session('s1', t1.id, '2026-08-08', '08:15', '09:15', 60, 'e1'),
      t2,
      session('s2', t2.id, '2026-08-08', '09:25', '10:25', 60, undefined, 'e2'),
      energy('e2', '2026-08-08', '10:35', 40, 35, 45),
      energy('e3', '2026-08-08', '14:05', 60, 60, 60),
      energy('e4', '2026-08-08', '20:00', 50, 45, 55),
      energy('e5', '2026-08-09', '08:05', 70, 70, 70),
    ];
    const visibleEnergy = records.filter((item) => item.coreBlock === 'energy');
    const result = buildEnergyPatterns(visibleEnergy, { activityRecords: records, analysisWindowDays: 30 });
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
