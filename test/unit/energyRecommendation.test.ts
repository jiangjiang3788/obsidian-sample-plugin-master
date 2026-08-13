import { buildEnergyActionRecommendations, type EnergyActionCandidate } from '@core/energy/public';

const candidates: EnergyActionCandidate[] = [
  {
    id: 'walk',
    title: '散步',
    source: 'plan',
    recoveryIntent: true,
    durationMinutes: 30,
    brainLoad: 'low',
    physicalLoad: 'low',
    valueScore: 55,
    historicalEffect: { meanDelta: 16, sampleCount: 6, meanBrainDelta: 20, meanPhysicalDelta: 12 },
  },
  {
    id: 'code',
    title: '核心代码',
    source: 'task',
    durationMinutes: 120,
    brainLoad: 'high',
    physicalLoad: 'low',
    valueScore: 95,
    historicalEffect: { meanDelta: -20, sampleCount: 8, meanBrainDelta: -28, meanPhysicalDelta: -10 },
  },
  {
    id: 'tidy',
    title: '收拾家',
    source: 'plan',
    durationMinutes: 25,
    brainLoad: 'low',
    physicalLoad: 'medium',
    valueScore: 45,
  },
];

describe('Energy action recommendation foundation', () => {
  it('prioritizes personally restorative low-load actions at score <= 40', () => {
    const result = buildEnergyActionRecommendations({ score: 40, brainScore: 30, physicalScore: 50 }, candidates);
    expect(result.band).toBe('recover');
    expect(result.recommendations[0].candidate.id).toBe('walk');
    expect(result.recommendations[0].evidence).toBe('personal');
    expect(result.recommendations[0].suggestedDurationMinutes).toBeLessThanOrEqual(30);
  });

  it('prioritizes high-value work in a high-Energy window while preserving a time cap for depleting history', () => {
    const result = buildEnergyActionRecommendations({ score: 80, brainScore: 85, physicalScore: 70 }, candidates);
    expect(result.band).toBe('use-capacity');
    expect(result.recommendations[0].candidate.id).toBe('code');
    expect(result.recommendations[0].suggestedDurationMinutes).toBe(45);
    expect(result.recommendations[0].reason).toContain('建议 45min');
  });

  it('uses high available energy for a meaningful work block instead of always preferring the shortest neutral task', () => {
    const rows: EnergyActionCandidate[] = [
      { id: 'short', title: '\u77ed\u5bb6\u52a1', source: 'task', durationMinutes: 20, valueScore: 50 },
      { id: 'deep', title: '\u6df1\u5ea6\u4efb\u52a1', source: 'task', durationMinutes: 90, valueScore: 50 },
    ];
    const result = buildEnergyActionRecommendations({ score: 85, brainScore: 90, physicalScore: 70 }, rows);
    expect(result.recommendations[0].candidate.id).toBe('deep');
  });

  it('keeps the middle band separate instead of forcing recovery or high-load work', () => {
    const result = buildEnergyActionRecommendations({ score: 60 }, candidates);
    expect(result.band).toBe('steady');
  });

  it('preserves a one-minute real task duration instead of replacing it with a generic work block', () => {
    const result = buildEnergyActionRecommendations({ score: 35 }, [
      { id: 'calcium', title: '吃钙片', source: 'task', durationMinutes: 1, brainLoad: 'low', physicalLoad: 'low', valueScore: 50 },
    ]);
    expect(result.recommendations[0].suggestedDurationMinutes).toBe(1);
  });

  it('marks high-load recommendations as preserve-capacity when current recorded load is high', () => {
    const result = buildEnergyActionRecommendations({
      score: 80,
      actionPolicy: { dailyTaskMinutes: 220, preserveCapacityRisk: true, preserveCapacityReason: 'daily-load' },
    }, candidates);
    expect(result.recommendations[0].preserveCapacity).toBe(true);
    expect(result.recommendations[0].stopReason).toBe('daily-load');
    expect(result.recommendations[0].suggestedDurationMinutes).toBeLessThanOrEqual(45);
  });
});
