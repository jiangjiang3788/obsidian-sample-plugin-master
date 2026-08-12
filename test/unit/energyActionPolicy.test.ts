import {
  buildEnergyActionPolicyContext,
  resolveEnergyActionTiming,
  type EnergyActionCandidate,
  type EnergyManagementModel,
} from '@core/energy/public';
import type { RecordViewItem } from '@core/types/public';

const candidate: EnergyActionCandidate = {
  id: 'code',
  title: '核心代码',
  source: 'task',
  durationMinutes: 120,
  valueScore: 90,
};

function session(id: string, duration: number, startedAt: string): RecordViewItem {
  const start = new Date(startedAt);
  const end = new Date(start.getTime() + duration * 60_000);
  return {
    id,
    title: '',
    content: '',
    tags: [],
    categoryKey: '',
    created: 0,
    modified: 0,
    coreBlock: 'task-session',
    taskId: `task.${id}`,
    sessionStartedAt: start.toISOString(),
    sessionEndedAt: end.toISOString(),
    sessionDurationMinutes: duration,
    sessionResult: 'work-block-ended',
    sessionSource: 'timer',
    extra: {},
  } as RecordViewItem;
}

describe('Energy action policy', () => {
  it('uses persisted TaskSession daily load to create a preserve-capacity stop point', () => {
    const policy = buildEnergyActionPolicyContext([
      session('a', 120, '2026-08-10T08:00:00.000Z'),
      session('b', 90, '2026-08-10T11:00:00.000Z'),
    ], null, '2026-08-10');
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

  it('shortens the block further when heavy Session load and personal depletion overlap', () => {
    const depleted = { ...candidate, historicalEffect: { meanDelta: -18, sampleCount: 6 } };
    const policy = buildEnergyActionPolicyContext([
      session('a', 180, '2026-08-10T08:00:00.000Z'),
      session('b', 80, '2026-08-10T12:00:00.000Z'),
    ], null, '2026-08-10');
    expect(resolveEnergyActionTiming(depleted, 'use-capacity', policy).minutes).toBe(30);
  });
});
