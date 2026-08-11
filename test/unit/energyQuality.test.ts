import type { Item } from '@core/types/public';
import { buildEnergyDataQuality } from '@core/energy/public';

function energy(id: string, date: string, time: string, mode: 'realtime' | 'retrospective', precision: 'exact' | 'approximate', detailed = false): Item {
  return {
    id,
    date,
    startTime: time,
    coreBlock: 'energy',
    categoryKey: '精力',
    extra: {
      核心Block: 'energy',
      精力值: 60,
      精力档位: 60,
      日期: date,
      时间: time,
      记录方式: mode,
      时间精度: precision,
      ...(detailed ? { 评分模式: 'detailed', 脑力精力: 70, 体力精力: 50 } : { 评分模式: 'quick' }),
    },
  } as Item;
}

describe('buildEnergyDataQuality', () => {
  it('keeps sparse periods limited and reports missing coverage', () => {
    const model = buildEnergyDataQuality([
      energy('e1', '2026-08-10', '08:00', 'realtime', 'exact'),
      energy('e2', '2026-08-11', '08:00', 'retrospective', 'approximate'),
    ], { startDate: '2026-08-10', endDate: '2026-08-16' });

    expect(model.level).toBe('limited');
    expect(model.sampledDays).toBe(2);
    expect(model.totalDays).toBe(7);
    expect(model.realtimeSamples).toBe(1);
    expect(model.retrospectiveSamples).toBe(1);
    expect(model.exactTimeSamples).toBe(1);
  });

  it('recognizes well-covered exact-time periods without inventing missing values', () => {
    const items = Array.from({ length: 7 }, (_, index) => energy(
      `e${index}`,
      `2026-08-${String(10 + index).padStart(2, '0')}`,
      '08:00',
      'realtime',
      'exact',
      index % 2 === 0,
    ));
    items.push(energy('extra', '2026-08-10', '16:00', 'realtime', 'exact'));
    const model = buildEnergyDataQuality(items, { startDate: '2026-08-10', endDate: '2026-08-16' });

    expect(model.level).toBe('strong');
    expect(model.sampledDays).toBe(7);
    expect(model.sampleCount).toBe(8);
    expect(model.coverageRatio).toBe(1);
    expect(model.approximateTimeSamples).toBe(0);
  });
});
