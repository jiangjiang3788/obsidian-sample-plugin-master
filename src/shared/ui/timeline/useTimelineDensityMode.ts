import { useEffect, useState } from 'preact/hooks';
import type { RefObject } from 'preact';

export type TimelineUiDensityMode = 'fine' | 'compact';
export const TIMELINE_COMPACT_WIDTH_PX = 720;

export function resolveTimelineDensityMode(input: {
  width: number;
  coarsePointer?: boolean;
}): TimelineUiDensityMode {
  return input.coarsePointer || input.width < TIMELINE_COMPACT_WIDTH_PX ? 'compact' : 'fine';
}

/**
 * Measure the actual Timeline host instead of assuming "desktop" or "mobile".
 * A phone/tablet coarse pointer is compact, and a narrow desktop split is also
 * compact. This keeps density tied to readable space rather than device names.
 */
export function useTimelineDensityMode(host: RefObject<HTMLElement>): TimelineUiDensityMode {
  const [mode, setMode] = useState<TimelineUiDensityMode>('fine');

  useEffect(() => {
    const win = host.current?.ownerDocument.defaultView;
    if (!win) return;

    let media: MediaQueryList | undefined;
    try {
      media = typeof win.matchMedia === 'function' ? win.matchMedia('(pointer: coarse)') : undefined;
    } catch {
      media = undefined;
    }

    const update = () => {
      const width = host.current?.clientWidth || win.innerWidth;
      setMode(resolveTimelineDensityMode({ width, coarsePointer: Boolean(media?.matches) }));
    };

    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    if (host.current) observer?.observe(host.current);
    win.addEventListener('resize', update);
    media?.addEventListener?.('change', update);

    return () => {
      observer?.disconnect();
      win.removeEventListener('resize', update);
      media?.removeEventListener?.('change', update);
    };
  }, [host]);

  return mode;
}
