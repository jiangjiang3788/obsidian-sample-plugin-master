import type { JSX } from 'preact';

export type EnergyDotDensity = 'timeline' | 'calendar';
export type EnergyCaptureVisual = 'realtime' | 'retrospective';

export interface EnergyDotVisual {
  score: number;
  band: 1 | 2 | 3 | 4 | 5;
  sizePx: number;
  capture: EnergyCaptureVisual;
}

const TIMELINE_SIZES: Record<EnergyDotVisual['band'], number> = {
  1: 10,
  2: 16,
  3: 23,
  4: 31,
  5: 40,
};

const CALENDAR_SIZES: Record<EnergyDotVisual['band'], number> = {
  1: 7,
  2: 11,
  3: 15,
  4: 20,
  5: 27,
};

export function energyScoreBand(score: number): EnergyDotVisual['band'] {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  if (value < 30) return 1;
  if (value < 50) return 2;
  if (value < 70) return 3;
  if (value < 90) return 4;
  return 5;
}

export function buildEnergyDotVisual(args: {
  score: number;
  capture: EnergyCaptureVisual;
  density?: EnergyDotDensity;
}): EnergyDotVisual {
  const score = Math.max(0, Math.min(100, Number(args.score) || 0));
  const band = energyScoreBand(score);
  const sizes = args.density === 'calendar' ? CALENDAR_SIZES : TIMELINE_SIZES;
  return {
    score,
    band,
    sizePx: sizes[band],
    capture: args.capture,
  };
}

export function energyDotStyle(visual: EnergyDotVisual, extra: Record<string, string> = {}): JSX.CSSProperties {
  return {
    '--think-energy-dot-size': `${visual.sizePx}px`,
    ...extra,
  } as JSX.CSSProperties;
}
