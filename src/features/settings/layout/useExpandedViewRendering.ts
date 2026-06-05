import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Layout, ViewInstance } from '@core/public';

const INITIAL_RENDERED_EXPANDED_VIEWS = 3;
const EXPANDED_VIEW_RENDER_BATCH_SIZE = 2;
const EXPANDED_VIEW_RENDER_DELAY_MS = 80;

export function useExpandedViewRendering({
  layout,
  allViews,
}: {
  layout: Layout;
  allViews: ViewInstance[];
}) {
  const [expandedState, setExpandedState] = useState<Record<string, boolean>>({});
  const [isStateInitialized, setIsStateInitialized] = useState(false);

  useEffect(() => {
    const initialState: Record<string, boolean> = {};
    layout.viewInstanceIds.forEach((viewId: string) => {
      const view = allViews.find((v: ViewInstance) => v.id === viewId);
      if (view) {
        initialState[viewId] = !view.collapsed;
      }
    });
    setExpandedState(initialState);
    setIsStateInitialized(true);
  }, [layout.id]);

  useEffect(() => {
    if (!isStateInitialized) return;

    setExpandedState(prevState => {
      const newState = { ...prevState };
      layout.viewInstanceIds.forEach((viewId: string) => {
        const view = allViews.find((v: ViewInstance) => v.id === viewId);
        if (view && !(viewId in prevState)) {
          newState[viewId] = !view.collapsed;
        }
      });
      return newState;
    });
  }, [allViews, isStateInitialized, layout.viewInstanceIds]);

  const expandedViewIds = useMemo(() => {
    if (!isStateInitialized) return [];
    return layout.viewInstanceIds.filter((viewId: string) => !!expandedState[viewId]);
  }, [expandedState, isStateInitialized, layout.viewInstanceIds]);

  const expandedViewSignature = expandedViewIds.join('|');
  const [renderedExpandedCount, setRenderedExpandedCount] = useState(INITIAL_RENDERED_EXPANDED_VIEWS);
  const renderedBatchLayoutIdRef = useRef<string | null>(null);

  useEffect(() => {
    setRenderedExpandedCount(current => {
      const firstBatchSize = Math.min(expandedViewIds.length, INITIAL_RENDERED_EXPANDED_VIEWS);
      if (renderedBatchLayoutIdRef.current !== layout.id) {
        renderedBatchLayoutIdRef.current = layout.id;
        return firstBatchSize;
      }

      return Math.min(expandedViewIds.length, Math.max(current, INITIAL_RENDERED_EXPANDED_VIEWS));
    });
  }, [expandedViewSignature, expandedViewIds.length, layout.id]);

  useEffect(() => {
    if (renderedExpandedCount >= expandedViewIds.length) return;

    const requestIdle = (window as any).requestIdleCallback as undefined | ((callback: () => void, options?: any) => number);
    const cancelIdle = (window as any).cancelIdleCallback as undefined | ((handle: number) => void);
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleHandle: number | null = null;

    const renderNextBatch = () => {
      setRenderedExpandedCount(current => Math.min(
        expandedViewIds.length,
        current + EXPANDED_VIEW_RENDER_BATCH_SIZE
      ));
    };

    if (requestIdle) {
      idleHandle = requestIdle(renderNextBatch, { timeout: EXPANDED_VIEW_RENDER_DELAY_MS * 2 });
    } else {
      timeoutId = setTimeout(renderNextBatch, EXPANDED_VIEW_RENDER_DELAY_MS);
    }

    return () => {
      if (idleHandle !== null && cancelIdle) cancelIdle(idleHandle);
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [expandedViewIds.length, expandedViewSignature, renderedExpandedCount]);

  const handleToggle = useCallback((viewId: string, event?: MouseEvent) => {
    const isToggleAll = event?.metaKey || event?.ctrlKey;

    if (isToggleAll) {
      setExpandedState(currentState => {
        const shouldExpandAll = !currentState[viewId];
        const newState: Record<string, boolean> = {};
        for (const id in currentState) {
          newState[id] = shouldExpandAll;
        }
        return newState;
      });
    } else {
      setExpandedState(prev => ({ ...prev, [viewId]: !prev[viewId] }));
    }
  }, []);

  return {
    expandedState,
    expandedViewIds,
    renderedExpandedCount,
    isStateInitialized,
    handleToggle,
  };
}
