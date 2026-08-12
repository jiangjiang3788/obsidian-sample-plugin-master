/** @jsxImportSource preact */
import { h } from 'preact';
import type { JSX } from 'preact';
import type { EnergyDotVisual } from './EnergyVisualEncoding';

interface Props {
  visual: EnergyDotVisual;
  selected?: boolean;
  title?: string;
  className?: string;
  style?: JSX.CSSProperties;
  onClick?: (event?: MouseEvent | KeyboardEvent) => void;
  cell?: boolean;
}

/**
 * Theme-isolated Energy marker.
 *
 * Important: this is intentionally an SVG root rather than a native button element.
 * Obsidian themes frequently style buttons and their child spans, which previously
 * produced a white circular button with a narrow purple stripe instead of a dot.
 * The SVG owns both geometry and fill, so realtime/historical semantics cannot be
 * changed by button chrome.
 */
export function EnergyDot({ visual, selected = false, title, className = '', style, onClick, cell = false }: Props) {
  const label = title || (visual.capture === 'retrospective' ? '补录精力点' : '实时精力点');
  const interactive = Boolean(onClick);
  const activate = (event?: MouseEvent | KeyboardEvent) => onClick?.(event);

  return (
    <svg
      viewBox="0 0 100 100"
      role={interactive ? 'button' : 'img'}
      tabIndex={interactive ? 0 : undefined}
      aria-label={label}
      class={`think-energy-dot ${cell ? 'is-cell' : 'is-plot'} is-${visual.capture} is-band-${visual.band} ${selected ? 'is-selected' : ''} ${className}`.trim()}
      style={style}
      onClick={(event) => activate(event)}
      onKeyDown={(event) => {
        if (!interactive) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate(event);
        }
      }}
    >
      <title>{label}</title>
      <circle class="think-energy-dot__selection" cx="50" cy="50" r="47" />
      <circle class="think-energy-dot__shape" cx="50" cy="50" r="41" />
    </svg>
  );
}
