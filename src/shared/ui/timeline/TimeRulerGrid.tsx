/** @jsxImportSource preact */
import type { JSX } from 'preact';

export interface TimeRulerTick {
  minute: number;
  offset: number;
  level: 'hour' | 'half' | 'quarter' | 'five';
  label?: string;
  strokeWidth: number;
  strokeOpacity: number;
  showInGrid?: boolean;
}

export type TimeRulerGridVariant = 'grid' | 'ruler';

/**
 * Rendering-only timeline guide.
 *
 * A-baseline deliberately separates the two jobs:
 * - `grid`: quiet structural lines behind records; 5-minute precision is omitted.
 * - `ruler`: short graduated ticks plus sparse labels for precise visual lookup.
 */
export function TimeRulerGrid({ ticks, height, labels = false, variant = labels ? 'ruler' : 'grid' }: {
  ticks: TimeRulerTick[];
  height: number;
  labels?: boolean;
  variant?: TimeRulerGridVariant;
}) {
  const visibleTicks = variant === 'grid' ? ticks.filter((tick) => tick.showInGrid !== false) : ticks;

  return <div
    className={`think-time-grid think-time-grid--${variant}${labels ? ' think-time-grid--labels' : ''}`}
    data-time-grid-variant={variant}
    aria-hidden="true"
  >
    {visibleTicks.map((tick) => <div
      key={tick.minute}
      className={`think-time-grid__tick think-time-grid__tick--${tick.level}`}
      data-tick-level={tick.level}
      data-tick-minute={tick.minute}
      style={{
        top: `${tick.offset}px`,
        '--timeline-tick-width': `${tick.strokeWidth}px`,
        '--timeline-tick-strength': `${tick.strokeOpacity * 100}%`,
      } as JSX.CSSProperties}
    >
      {labels && tick.label && <span
        className={`think-time-grid__label${tick.offset === 0 ? ' is-first' : tick.offset === height ? ' is-last' : ''}`}
      >{tick.label}</span>}
    </div>)}
  </div>;
}
