export type TimelineTickLevel = 'hour' | 'half' | 'quarter' | 'five';
export type TimelineDensityMode = 'fine' | 'compact';

export interface TimelineScaleTick {
  minute: number;
  offset: number;
  level: TimelineTickLevel;
  strokeWidth: number;
  strokeOpacity: number;
  /**
   * Whether this tick participates in the per-day data-column guide.
   * Its semantic level decides whether CSS renders an edge graduation or a
   * full-width structural guide.
   */
  showInGrid: boolean;
  label?: string;
}

export interface TimelineScale {
  hourHeight: number;
  height: number;
  densityMode: TimelineDensityMode;
  /** Finest visible ruler tick. */
  tickStepMinutes: number;
  /** Finest graduation rendered by each data-column time guide. */
  gridStepMinutes: number;
  labelStepMinutes: number;
  tickPixelGap: number;
  labelPixelGap: number;
  /** @deprecated Use tickPixelGap. Retained for compatibility with older callers. */
  minimumGap: number;
  ticks: TimelineScaleTick[];
}

/**
 * A-baseline perceptual hierarchy.
 *
 * These values intentionally use a non-linear visual ladder. A secondary line
 * should not be only numerically different from a primary line; it must be
 * perceptually quieter. Hue stays neutral while lightness/weight separate the
 * information levels. Precision ticks stay short and local to ruler/day edges;
 * only the 30-minute and 1-hour structure guides cross the data canvas.
 */
export const TIMELINE_TICK_STYLE = Object.freeze({
  hour: { width: 1, opacity: 0.38 },
  half: { width: 0.75, opacity: 0.23 },
  quarter: { width: 0.625, opacity: 0.12 },
  five: { width: 0.5, opacity: 0.07 },
});

/**
 * Density is driven by visual distance, not a desktop/mobile product label.
 *
 * `fine` is used by a sufficiently wide, fine-pointer surface.
 * `compact` is used for touch surfaces and narrow panes (including a narrow
 * desktop split). Each semantic level has a minimum visual separation before it
 * is admitted to the ruler. The 5-minute level can therefore exist from
 * 50 px/hour as a short ruler/edge tick without becoming a full-width grid line.
 */
export const TIMELINE_SCALE_POLICY = Object.freeze({
  fine: {
    minimumTickGapPx: {
      // A 5-minute graduation becomes useful at roughly 50 px/hour once it is
      // confined to ruler/edge ticks instead of repeated as full-width lines.
      five: 5 * (50 / 60),
      quarter: 14,
      half: 18,
      hour: 16,
    },
    fallbackTickGapPx: 18,
    minimumLabelGapPx: 44,
  },
  compact: {
    minimumTickGapPx: {
      five: 5 * (50 / 60),
      quarter: 15,
      half: 20,
      hour: 24,
    },
    fallbackTickGapPx: 28,
    minimumLabelGapPx: 52,
  },
} as const);

const SEMANTIC_TICK_CANDIDATES: ReadonlyArray<{ step: number; level: TimelineTickLevel }> = [
  { step: 5, level: 'five' },
  { step: 15, level: 'quarter' },
  { step: 30, level: 'half' },
  { step: 60, level: 'hour' },
];

const FALLBACK_TICK_STEPS = [120, 180, 240, 360, 720, 1440] as const;
// A-baseline: text labels are an orientation layer, not a second grid. Keep them
// on whole hours (or sparser when the surface is too compressed).
const LABEL_STEPS = [60, 120, 180, 240, 360, 720, 1440] as const;

function resolveTickStep(pixelsPerMinute: number, densityMode: TimelineDensityMode): number {
  const policy = TIMELINE_SCALE_POLICY[densityMode];

  for (const candidate of SEMANTIC_TICK_CANDIDATES) {
    const requiredGap = policy.minimumTickGapPx[candidate.level];
    if (candidate.step * pixelsPerMinute >= requiredGap) return candidate.step;
  }

  return FALLBACK_TICK_STEPS.find((step) => step * pixelsPerMinute >= policy.fallbackTickGapPx) ?? 1440;
}

function resolveLabelStep(
  pixelsPerMinute: number,
  tickStepMinutes: number,
  densityMode: TimelineDensityMode,
): number {
  const minimumLabelGap = TIMELINE_SCALE_POLICY[densityMode].minimumLabelGapPx;
  return LABEL_STEPS.find((step) => (
    step >= tickStepMinutes
    && step % tickStepMinutes === 0
    && step * pixelsPerMinute >= minimumLabelGap
  )) ?? 1440;
}

function resolveTickLevel(minute: number): TimelineTickLevel {
  if (minute % 60 === 0) return 'hour';
  if (minute % 30 === 0) return 'half';
  if (minute % 15 === 0) return 'quarter';
  return 'five';
}

function formatClockMinute(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

/**
 * Build rendering resolution for Timeline rulers.
 *
 * This function only controls what is drawn. It MUST NOT be used to round record
 * timestamps, infer durations, or change drag snapping precision.
 */
export function buildTimelineScale(input: {
  hourHeight: number;
  maxHours?: number;
  startMinute?: number;
  endMinute?: number;
  densityMode?: TimelineDensityMode;
  /** @deprecated Prefer densityMode="compact". */
  coarsePointer?: boolean;
}): TimelineScale {
  const hourHeight = Number.isFinite(input.hourHeight) ? Math.max(1, input.hourHeight) : 60;
  const maximum = Number.isFinite(input.maxHours) ? Math.max(0, Math.min(24, input.maxHours!)) * 60 : 1440;
  const start = Number.isFinite(input.startMinute) ? Math.max(0, Math.min(maximum, input.startMinute!)) : 0;
  const end = Number.isFinite(input.endMinute) ? Math.max(start, Math.min(maximum, input.endMinute!)) : maximum;
  const densityMode: TimelineDensityMode = input.densityMode ?? (input.coarsePointer ? 'compact' : 'fine');
  const pixelsPerMinute = hourHeight / 60;
  const tickStepMinutes = resolveTickStep(pixelsPerMinute, densityMode);
  // Data-column guides use the same resolution as the ruler. Presentation is
  // intentionally tiered in CSS: 5/15-minute ticks stay on the day edge while
  // 30/60-minute structure guides cross the full column. One resolution source;
  // one semantic level model; presentation remains rendering-only.
  const gridStepMinutes = tickStepMinutes;
  const labelStepMinutes = resolveLabelStep(pixelsPerMinute, tickStepMinutes, densityMode);
  const tickPixelGap = tickStepMinutes * pixelsPerMinute;
  const labelPixelGap = labelStepMinutes * pixelsPerMinute;
  const ticks: TimelineScaleTick[] = [];
  let lastLabelOffset = -Infinity;
  const minimumLabelGap = TIMELINE_SCALE_POLICY[densityMode].minimumLabelGapPx;

  for (let minute = Math.ceil(start / tickStepMinutes) * tickStepMinutes; minute <= end; minute += tickStepMinutes) {
    const level = resolveTickLevel(minute);
    const offset = (minute - start) * pixelsPerMinute;
    const label = minute % labelStepMinutes === 0 && offset - lastLabelOffset >= minimumLabelGap
      ? formatClockMinute(minute)
      : undefined;
    if (label) lastLabelOffset = offset;
    const style = TIMELINE_TICK_STYLE[level];
    ticks.push({
      minute,
      offset,
      level,
      label,
      strokeWidth: style.width,
      strokeOpacity: style.opacity,
      showInGrid: minute % gridStepMinutes === 0,
    });
  }

  return {
    hourHeight,
    height: (end - start) * pixelsPerMinute,
    densityMode,
    tickStepMinutes,
    gridStepMinutes,
    labelStepMinutes,
    tickPixelGap,
    labelPixelGap,
    minimumGap: tickPixelGap,
    ticks,
  };
}
