import { buildEnergyTimeline } from '@core/energy/public';

function energy(id: string, date: string, time: string, score: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    title: '',
    content: '',
    tags: [],
    categoryKey: '精力',
    coreBlock: 'energy',
    date,
    created: 0,
    modified: 0,
    extra: {
      '时间': time,
      '精力值': score,
      '精力档位': score <= 30 ? 20 : score <= 50 ? 40 : score <= 70 ? 60 : score <= 90 ? 80 : 100,
      '评分模式': 'quick',
      '记录方式': 'realtime',
      ...extra,
    },
  } as any;
}

describe('Energy sparse timeline', () => {
  it('keeps missing days explicit and never fills them with zero', () => {
    const model = buildEnergyTimeline([
      energy('a', '2026-08-04', '09:00', 80),
      energy('b', '2026-08-06', '15:30', 40),
      energy('c', '2026-08-10', '20:00', 60),
    ], { windowDays: 7 });

    expect(model?.coverage).toMatchObject({
      startDate: '2026-08-04',
      endDate: '2026-08-10',
      sampledDays: 3,
      missingDays: 4,
      totalSamples: 3,
    });
    expect(model?.days.find((day) => day.date === '2026-08-05')).toEqual({
      date: '2026-08-05',
      sampled: false,
      points: [],
    });
  });

  it('separates realtime, retrospective and detailed samples while preserving dimensions', () => {
    const model = buildEnergyTimeline([
      energy('a', '2026-08-10', '09:00', 80),
      energy('b', '2026-08-10', '15:30', 57, {
        '评分模式': 'detailed',
        '脑力精力': 73,
        '体力精力': 41,
        '记录方式': 'retrospective',
        '记录时间': '2026-08-10 21:00',
      }),
    ], { windowDays: 1 });

    expect(model?.coverage).toMatchObject({
      totalSamples: 2,
      realtimeSamples: 1,
      retrospectiveSamples: 1,
      detailedSamples: 1,
    });
    expect(model?.days[0]?.points[1]).toMatchObject({
      score: 57,
      brainScore: 73,
      physicalScore: 41,
      captureMode: 'retrospective',
    });
  });
});
