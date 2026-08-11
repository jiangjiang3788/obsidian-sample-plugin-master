import { isEnergyItem, readEnergyItemSnapshot } from '@core/energy/public';

describe('Energy Item adapter', () => {
  it('restores detailed Energy fields without converting missing data to zero', () => {
    const item: any = {
      coreBlock: 'energy',
      categoryKey: '精力',
      date: '2026-08-10',
      extra: {
        '时间': '14:35',
        '精力值': 57,
        '精力档位': 60,
        '脑力精力': 73,
        '体力精力': 41,
        '评分模式': 'detailed',
        '记录方式': 'retrospective',
        '时间精度': 'exact',
      },
    };
    expect(isEnergyItem(item)).toBe(true);
    expect(readEnergyItemSnapshot(item)).toMatchObject({
      score: 57,
      quickLevel: 60,
      brainScore: 73,
      physicalScore: 41,
      date: '2026-08-10',
      time: '14:35',
      captureMode: 'retrospective',
      timePrecision: 'exact',
    });
    expect(readEnergyItemSnapshot({ ...item, extra: {} })).toBeNull();
  });
});
