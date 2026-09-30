import type { RefObject } from 'preact';
import { useTimelineDensityMode } from './useTimelineDensityMode';

export {
  TIMELINE_COMPACT_WIDTH_PX,
  resolveTimelineDensityMode,
  useTimelineDensityMode,
} from './useTimelineDensityMode';
export type { TimelineUiDensityMode } from './useTimelineDensityMode';

/** @deprecated Use useTimelineDensityMode so callers can expose/debug the mode. */
export function useCoarseTimelineDensity(host: RefObject<HTMLElement>): boolean {
  return useTimelineDensityMode(host) === 'compact';
}
