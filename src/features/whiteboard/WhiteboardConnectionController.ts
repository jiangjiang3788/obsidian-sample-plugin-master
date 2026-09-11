import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { WhiteboardItem, WhiteboardStore } from '@core/whiteboard/public';
import { screenToWhiteboardWorld, type WhiteboardCamera, type WhiteboardWorldPoint } from './WhiteboardCameraModel';

export interface WhiteboardConnectionPreview {
  sourceItemId: string;
  targetItemId: string | null;
  start: WhiteboardWorldPoint;
  end: WhiteboardWorldPoint;
}

interface WhiteboardConnectionControllerInput {
  boardId: string;
  items: WhiteboardItem[];
  storeReady: boolean;
  whiteboardStore: WhiteboardStore;
  viewportRef: { current: HTMLDivElement | null };
  camera: WhiteboardCamera;
  zoom: number;
  onNotice?: (message: string) => void;
}

interface ConnectionSession {
  pointerId: number;
  sourceItemId: string;
  start: WhiteboardWorldPoint;
  viewportLeft: number;
  viewportTop: number;
  camera: WhiteboardCamera;
  zoom: number;
  target: HTMLElement | null;
}

function targetItemIdAtPoint(sourceItemId: string, clientX: number, clientY: number): string | null {
  const element = document.elementFromPoint?.(clientX, clientY) ?? null;
  const card = element?.closest?.('[data-whiteboard-item-id]') ?? null;
  const itemId = card?.getAttribute('data-whiteboard-item-id')?.trim() ?? '';
  return itemId && itemId !== sourceItemId ? itemId : null;
}

export function useWhiteboardConnectionController({
  boardId, items, storeReady, whiteboardStore, viewportRef, camera, zoom, onNotice,
}: WhiteboardConnectionControllerInput) {
  const [preview, setPreview] = useState<WhiteboardConnectionPreview | null>(null);
  const [committing, setCommitting] = useState(false);
  const sessionRef = useRef<ConnectionSession | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const clearListeners = useCallback(() => { cleanupRef.current?.(); cleanupRef.current = null; }, []);
  const worldPoint = (session: ConnectionSession, clientX: number, clientY: number) => screenToWhiteboardWorld(
    { clientX, clientY }, { left: session.viewportLeft, top: session.viewportTop }, session.camera, session.zoom,
  );
  const resolveTarget = (session: ConnectionSession, clientX: number, clientY: number) => {
    const itemId = targetItemIdAtPoint(session.sourceItemId, clientX, clientY);
    return itemId && items.some((item) => item.id === itemId) ? itemId : null;
  };

  const finish = useCallback((event: PointerEvent, cancelled: boolean) => {
    const session = sessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation(); sessionRef.current = null; clearListeners();
    try { session.target?.releasePointerCapture?.(event.pointerId); } catch { /* host may already release capture */ }
    const targetItemId = cancelled ? null : resolveTarget(session, event.clientX, event.clientY);
    setPreview(null);
    if (!targetItemId || !storeReady || committing) return;
    setCommitting(true);
    void whiteboardStore.addEdge(boardId, session.sourceItemId, targetItemId)
      .catch((error) => onNotice?.(`创建白板连线失败：${error instanceof Error ? error.message : String(error)}`))
      .finally(() => setCommitting(false));
  }, [boardId, clearListeners, committing, items, onNotice, storeReady, whiteboardStore]);

  const beginConnection = useCallback((itemId: string, event: PointerEvent) => {
    if (!storeReady || committing || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const viewport = viewportRef.current; if (!viewport || !items.some((item) => item.id === itemId)) return;
    event.preventDefault(); event.stopPropagation(); clearListeners();
    const rect = viewport.getBoundingClientRect();
    const session: ConnectionSession = {
      pointerId: event.pointerId, sourceItemId: itemId,
      start: screenToWhiteboardWorld({ clientX: event.clientX, clientY: event.clientY }, { left: rect.left, top: rect.top }, camera, zoom),
      viewportLeft: rect.left, viewportTop: rect.top, camera: { ...camera }, zoom, target: event.currentTarget as HTMLElement,
    };
    sessionRef.current = session; setPreview({ sourceItemId: itemId, targetItemId: null, start: session.start, end: session.start });
    try { session.target?.setPointerCapture?.(event.pointerId); } catch { /* optional in host */ }
    const move = (next: PointerEvent) => {
      if (sessionRef.current?.pointerId !== next.pointerId) return;
      next.preventDefault(); next.stopPropagation();
      setPreview({ sourceItemId: itemId, targetItemId: resolveTarget(session, next.clientX, next.clientY), start: session.start, end: worldPoint(session, next.clientX, next.clientY) });
    };
    const up = (next: PointerEvent) => finish(next, false); const cancel = (next: PointerEvent) => finish(next, true);
    window.addEventListener('pointermove', move, true); window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', cancel, true);
    cleanupRef.current = () => { window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', cancel, true); };
  }, [camera, clearListeners, committing, finish, items, storeReady, viewportRef, zoom]);

  useEffect(() => () => { clearListeners(); sessionRef.current = null; }, [clearListeners]);
  return { preview, committing, beginConnection };
}
