import { useCallback, useEffect, useState } from 'preact/hooks';
import type { Layout, ViewInstance } from '@core/types/public';

/**
 * Owns only expand/collapse state.
 * Heavy view mounting is handled separately by ViewportDeferredView so this hook must
 * not run timed render batches that cause the whole dashboard to re-render repeatedly.
 */
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
      const view = allViews.find((candidate: ViewInstance) => candidate.id === viewId);
      if (view) initialState[viewId] = !view.collapsed;
    });
    setExpandedState(initialState);
    setIsStateInitialized(true);
  }, [layout.id]);

  useEffect(() => {
    if (!isStateInitialized) return;
    setExpandedState((previous) => {
      let changed = false;
      const next = { ...previous };
      for (const viewId of layout.viewInstanceIds) {
        if (viewId in next) continue;
        const view = allViews.find((candidate: ViewInstance) => candidate.id === viewId);
        if (!view) continue;
        next[viewId] = !view.collapsed;
        changed = true;
      }
      return changed ? next : previous;
    });
  }, [allViews, isStateInitialized, layout.viewInstanceIds]);

  const handleToggle = useCallback((viewId: string, event?: MouseEvent | KeyboardEvent) => {
    const isToggleAll = event?.metaKey || event?.ctrlKey;
    if (isToggleAll) {
      setExpandedState((currentState) => {
        const shouldExpandAll = !currentState[viewId];
        const next: Record<string, boolean> = {};
        for (const id of layout.viewInstanceIds) next[id] = shouldExpandAll;
        return next;
      });
      return;
    }
    setExpandedState((previous) => ({ ...previous, [viewId]: !previous[viewId] }));
  }, [layout.viewInstanceIds]);

  return {
    expandedState,
    isStateInitialized,
    handleToggle,
  };
}
