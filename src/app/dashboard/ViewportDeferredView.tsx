/** @jsxImportSource preact */
import { h } from 'preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { getViewDefinition } from '@core/view/public';
import type { ViewName } from '@core/types/public';
import { detectThinkDeviceProfile } from '@shared/utils/public';

function getInitialDeferredHeight(viewType: ViewName): number {
  return getViewDefinition(viewType)?.layout.deferredMinHeight ?? 320;
}

export function ViewportDeferredView({ viewType, children }: { viewType: ViewName; children: ComponentChildren }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  // Android WebViews can miss the first IntersectionObserver notification for
  // very tall timelines inside nested Obsidian scrollers. Never hide the only
  // timeline behind a potentially permanent mobile deferred placeholder.
  const eagerMobileTimeline = viewType === 'TimelineView' && detectThinkDeviceProfile().isMobileLike;
  const [nearViewport, setNearViewport] = useState(eagerMobileTimeline);
  const [measuredHeight, setMeasuredHeight] = useState(() => getInitialDeferredHeight(viewType));

  useEffect(() => {
    setMeasuredHeight(getInitialDeferredHeight(viewType));
  }, [viewType]);

  useEffect(() => {
    if (eagerMobileTimeline) {
      setNearViewport(true);
      return;
    }
    const host = hostRef.current;
    if (!host) return;
    if (typeof IntersectionObserver === 'undefined') {
      setNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry) setNearViewport(entry.isIntersecting);
    }, {
      root: null,
      rootMargin: '320px 0px',
      threshold: 0,
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, [viewType, eagerMobileTimeline]);

  useEffect(() => {
    if (!nearViewport) return;
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const height = Math.ceil(entries[0]?.contentRect.height || 0);
      if (height > 40) setMeasuredHeight(height);
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, [nearViewport]);

  return (
    <div
      ref={hostRef}
      className={`think-view-viewport-gate${nearViewport ? ' is-active' : ' is-deferred'}`}
      style={nearViewport ? undefined : { minHeight: `${measuredHeight}px` }}
    >
      {nearViewport ? children : (
        <div className="module-deferred-placeholder">滚动到附近时加载视图</div>
      )}
    </div>
  );
}
