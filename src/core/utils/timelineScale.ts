export type TimelineTickLevel = 'major' | 'hour' | 'half' | 'quarter' | 'five';
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
 * only the 30-minute, hourly, and three-hour anchor guides cross the data canvas.
 */
export const TIMELINE_TICK_STYLE = Object.freeze({
  // Three-hour anchors (00/03/06/09/12/15/18/21/24) are intentionally heavier
  // than ordinary hour rules so time-of-day can be recognized from the line
  // pattern before reading a label. Other levels stay on full device pixels.
  major: { width: 2, opacity: 0.88 },
  hour: { width: 1, opacity: 0.68 },
  half: { width: 1, opacity: 0.42 },
  quarter: { width: 1, opacity: 0.28 },
  five: { width: 1, opacity: 0.18 },
});

/**
 * Density is driven by visual distance, not a desktop/mobile product label.
 *
 * `fine` is used by a sufficiently wide, fine-pointer surface.
 * `compact` is used for touch surfaces and narrow panes (including a narrow
 * desktop split). Each semantic level has a minimum visual separation before it
 * is admitted to the ruler. The 5-minute level is intentionally delayed until
 * roughly 120 px/hour so default zoom stays readable instead of becoming visual noise.
 */
export const TIMELINE_SCALE_POLICY = Object.freeze({
  // Desktop and touch share one semantic-density contract. The finest tick is
  // admitted only when it has enough physical separation to remain readable.
  fine: {
    minimumTickGapPx: {
      five: 10,
      quarter: 10,
      half: 14,
      hour: 18,
    },
    fallbackTickGapPx: 18,
    minimumLabelGapPx: 44,
  },
  compact: {
    minimumTickGapPx: {
      five: 10,
      quarter: 10,
      half: 14,
      hour: 18,
    },
    fallbackTickGapPx: 18,
    minimumLabelGapPx: 44,
  },
} as const);

const SEMANTIC_TICK_CANDIDATES: ReadonlyArray<{ step: number; level: Exclude<TimelineTickLevel, 'major'> }> = [
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

const MAJOR_HOUR_STEP_MINUTES = 3 * 60;

function resolveTickLevel(minute: number): TimelineTickLevel {
  if (minute % MAJOR_HOUR_STEP_MINUTES === 0) return 'major';
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
  // 30/60-minute structure guides plus 3-hour anchors cross the full column.
  // One resolution source; one semantic level model; presentation remains rendering-only.
  const gridStepMinutes = tickStepMinutes;
  const labelStepMinutes = resolveLabelStep(pixelsPerMinute, tickStepMinutes, densityMode);
  const tickPixelGap = tickStepMinutes * pixelsPerMinute;
  const labelPixelGap = labelStepMinutes * pixelsPerMinute;
  const ticks: TimelineScaleTick[] = [];
  let lastLabelOffset = -Infinity;
  const minimumLabelGap = TIMELINE_SCALE_POLICY[densityMode].minimumLabelGapPx;
  const tickMinutes = new Set<number>();

  // Resolution ticks answer “how precise is the current zoom?”. Three-hour
  // anchors answer a different question: “where am I in the day?”. Keep the two
  // concerns independent so 03/06/09/12… remain recognizable even when a very
  // compressed view chooses a coarser base resolution.
  for (let minute = Math.ceil(start / tickStepMinutes) * tickStepMinutes; minute <= end; minute += tickStepMinutes) {
    tickMinutes.add(minute);
  }
  for (let minute = Math.ceil(start / MAJOR_HOUR_STEP_MINUTES) * MAJOR_HOUR_STEP_MINUTES; minute <= end; minute += MAJOR_HOUR_STEP_MINUTES) {
    tickMinutes.add(minute);
  }

  for (const minute of [...tickMinutes].sort((a, b) => a - b)) {
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
      showInGrid: level === 'major' || minute % gridStepMinutes === 0,
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
