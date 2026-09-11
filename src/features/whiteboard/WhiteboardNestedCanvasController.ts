import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { WhiteboardAnnotation, WhiteboardGroup, WhiteboardItem } from '@core/whiteboard/public';
import { getWhiteboardGroupPathIds } from '@core/whiteboard/public';
import type { WhiteboardWorldPoint } from './WhiteboardCameraModel';
import {
  createWhiteboardCanvasNavigationHistory,
  getWhiteboardCanvasNavigationTarget,
  pushWhiteboardCanvasNavigation,
  stepWhiteboardCanvasNavigation,
  type WhiteboardCanvasNavigationHistory,
} from './WhiteboardNestedNavigationModel';
import { getWhiteboardWorkbenchHomePoint } from './WhiteboardWorkbenchModel';

interface WhiteboardNestedCanvasControllerInput {
  groups: readonly WhiteboardGroup[];
  items: readonly WhiteboardItem[];
  annotations: readonly WhiteboardAnnotation[];
  resetViewOnWorldPoint: (point: WhiteboardWorldPoint) => void;
  rootCenter: WhiteboardWorldPoint;
}

export function useWhiteboardNestedCanvasController({ groups, items, annotations, resetViewOnWorldPoint, rootCenter }: WhiteboardNestedCanvasControllerInput) {
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [history, setHistory] = useState<WhiteboardCanvasNavigationHistory>(() => createWhiteboardCanvasNavigationHistory());
  const historyRef = useRef(history);
  historyRef.current = history;
  const groupById = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);
  const path = useMemo(() => activeGroupId
    ? getWhiteboardGroupPathIds(groups, activeGroupId).map((id) => groupById.get(id)).filter((group): group is WhiteboardGroup => Boolean(group))
    : [], [activeGroupId, groupById, groups]);
  const activeCanvasCenter = useMemo(() => {
    const group = activeGroupId ? groupById.get(activeGroupId) : undefined;
    return group ? getWhiteboardWorkbenchHomePoint(group, items, groups, annotations) : rootCenter;
  }, [activeGroupId, annotations, groupById, groups, items, rootCenter]);

  const focusTarget = useCallback((groupId: string | null, resetView: boolean) => {
    if (groupId && !groupById.has(groupId)) return false;
    setActiveGroupId(groupId);
    if (resetView) {
      const group = groupId ? groupById.get(groupId) : undefined;
      resetViewOnWorldPoint(group ? getWhiteboardWorkbenchHomePoint(group, items, groups, annotations) : rootCenter);
    }
    return true;
  }, [annotations, groupById, groups, items, resetViewOnWorldPoint, rootCenter]);

  const enterGroup = useCallback((groupId: string | null) => {
    if (!focusTarget(groupId, true)) return;
    const next = pushWhiteboardCanvasNavigation(historyRef.current, groupId);
    historyRef.current = next; setHistory(next);
  }, [focusTarget]);

  const stepHistory = useCallback((delta: -1 | 1) => {
    let next = historyRef.current;
    while (true) {
      const stepped = stepWhiteboardCanvasNavigation(next, delta);
      if (stepped.index === next.index) return;
      next = stepped;
      const target = getWhiteboardCanvasNavigationTarget(next);
      if (!target || groupById.has(target)) break;
    }
    historyRef.current = next; setHistory(next); focusTarget(getWhiteboardCanvasNavigationTarget(next), true);
  }, [focusTarget, groupById]);

  useEffect(() => {
    if (!activeGroupId || groupById.has(activeGroupId)) return;
    const next = pushWhiteboardCanvasNavigation(historyRef.current, null);
    historyRef.current = next; setHistory(next); focusTarget(null, true);
  }, [activeGroupId, focusTarget, groupById]);

  const enterParent = useCallback(() => {
    if (!activeGroupId) return;
    enterGroup(groupById.get(activeGroupId)?.parentGroupId ?? null);
  }, [activeGroupId, enterGroup, groupById]);
  const enterRoot = useCallback(() => enterGroup(null), [enterGroup]);
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.key !== 'Escape' || !activeGroupId) return;
    const target = event.target as HTMLElement | null;
    if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')) return;
    event.preventDefault(); enterParent();
  }, [activeGroupId, enterParent]);
  const revealItem = useCallback((item: WhiteboardItem) => {
    const nextGroupId = item.groupId ?? null;
    if (nextGroupId === activeGroupId || !focusTarget(nextGroupId, false)) return;
    const next = pushWhiteboardCanvasNavigation(historyRef.current, nextGroupId);
    historyRef.current = next; setHistory(next);
  }, [activeGroupId, focusTarget]);

  return {
    activeGroupId,
    activeCanvasCenter,
    path,
    enterGroup,
    enterParent,
    enterRoot,
    revealItem,
    handleKeyDown,
    canGoBack: history.index > 0,
    canGoForward: history.index < history.entries.length - 1,
    goBack: () => stepHistory(-1),
    goForward: () => stepHistory(1),
  };
}
