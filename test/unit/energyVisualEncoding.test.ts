import { buildEnergyDotVisual, energyScoreBand } from '@/features/settings/views/runtime/EnergyVisualEncoding';

describe('Energy visual encoding', () => {
  it('maps the five quick scores to five visibly separated timeline sizes', () => {
    const sizes = [20, 40, 60, 80, 100].map((score) => buildEnergyDotVisual({ score, capture: 'realtime' }).sizePx);
    expect(sizes).toEqual([10, 16, 23, 31, 40]);
  });

  it('uses a compact but still separated scale for quarter/year calendars', () => {
    const sizes = [20, 40, 60, 80, 100].map((score) => buildEnergyDotVisual({ score, capture: 'realtime', density: 'calendar' }).sizePx);
    expect(sizes).toEqual([7, 11, 15, 20, 27]);
  });

  it('keeps realtime/retrospective as an independent visual channel', () => {
    expect(buildEnergyDotVisual({ score: 80, capture: 'realtime' }).capture).toBe('realtime');
    expect(buildEnergyDotVisual({ score: 80, capture: 'retrospective' }).capture).toBe('retrospective');
  });

  it('bins detailed percent scores predictably', () => {
    expect([20, 40, 60, 80, 100].map(energyScoreBand)).toEqual([1, 2, 3, 4, 5]);
    expect(energyScoreBand(73)).toBe(4);
  });
});
