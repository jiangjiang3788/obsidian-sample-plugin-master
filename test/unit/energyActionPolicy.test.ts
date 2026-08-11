import {
  buildEnergyActionPolicyContext,
  resolveEnergyActionTiming,
  type EnergyActionCandidate,
  type EnergyManagementModel,
} from '@core/energy/public';
import type { Item } from '@core/types/public';

const candidate: EnergyActionCandidate = {
  id: 'code',
  title: '\u6838\u5fc3\u4ee3\u7801',
  source: 'task',
  durationMinutes: 120,
  valueScore: 90,
};

function task(id: string, duration: number): Item {
  return {
    id,
    title: id,
    content: `- [x] ${id}`,
    type: 'task',
    tags: [],
    categoryKey: '\u4efb\u52a1',
    recurrence: '',
    created: 0,
    modified: 0,
    coreBlock: 'task',
    date: '2026-08-10',
    duration,
    extra: {},
  } as Item;
}

describe('Energy action policy', () => {
  it('uses recorded daily task load to create a preserve-capacity stop point', () => {
    const policy = buildEnergyActionPolicyContext([task('a', 120), task('b', 90)], null, '2026-08-10');
    expect(policy.dailyTaskMinutes).toBe(210);
    expect(policy.preserveCapacityRisk).toBe(true);
    const timing = resolveEnergyActionTiming(candidate, 'use-capacity', policy);
    expect(timing.minutes).toBe(45);
    expect(timing.preserveCapacity).toBe(true);
    expect(timing.stopReason).toContain('210min');
  });

  it('uses personal stop guardrails even before daily load is high', () => {
    const management = {
      guardrails: [{ key: 'preserve-capacity', title: '', detail: '', level: 'caution', sampleCount: 4, evidence: 'exploratory' }],
    } as EnergyManagementModel;
    const policy = buildEnergyActionPolicyContext([], management, '2026-08-10');
    expect(policy.preserveCapacityRisk).toBe(true);
    expect(resolveEnergyActionTiming(candidate, 'use-capacity', policy).minutes).toBe(45);
  });

  it('shortens the block further when heavy daily load and personal depletion overlap', () => {
    const depleted = { ...candidate, historicalEffect: { meanDelta: -18, sampleCount: 6 } };
    const policy = buildEnergyActionPolicyContext([task('a', 180), task('b', 80)], null, '2026-08-10');
    expect(resolveEnergyActionTiming(depleted, 'use-capacity', policy).minutes).toBe(30);
  });
});
