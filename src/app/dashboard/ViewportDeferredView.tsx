/** @jsxImportSource preact */
import { h } from 'preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { getViewDefinition } from '@core/view/public';
import type { ViewName } from '@core/types/public';

function getInitialDeferredHeight(viewType: ViewName): number {
  return getViewDefinition(viewType)?.layout.deferredMinHeight ?? 320;
}

export function ViewportDeferredView({ viewType, children }: { viewType: ViewName; children: ComponentChildren }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState(() => getInitialDeferredHeight(viewType));

  useEffect(() => {
    setMeasuredHeight(getInitialDeferredHeight(viewType));
  }, [viewType]);

  useEffect(() => {
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
  }, [viewType]);

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
