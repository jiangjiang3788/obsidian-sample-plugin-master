import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  centerWhiteboardCameraOnWorldPoint,
  createWhiteboardPanSession,
  fitWhiteboardBoundsToViewport,
  getWhiteboardWorldTransform,
  resolveWhiteboardPannedCamera,
  resolveWhiteboardWheelPannedCamera,
  resolveWhiteboardZoomedCamera,
  WHITEBOARD_CAMERA_DEFAULT,
  type WhiteboardCamera,
  type WhiteboardPanSession,
  type WhiteboardWorldBounds,
  type WhiteboardWorldPoint,
} from './WhiteboardCameraModel';
import { getWhiteboardGridStyle } from './WhiteboardGridModel';
import {
  clampWhiteboardZoom,
  resolveWhiteboardWheelZoom,
  stepWhiteboardZoom,
  WHITEBOARD_ZOOM_DEFAULT,
} from './WhiteboardZoomModel';

interface WhiteboardViewportState {
  camera: WhiteboardCamera;
  zoom: number;
}

export interface WhiteboardViewportController {
  camera: WhiteboardCamera;
  zoom: number;
  panning: boolean;
  worldTransform: string;
  gridStyle: string;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  handleWheel: (event: WheelEvent) => void;
  beginPan: (event: PointerEvent) => void;
  centerOnWorldPoint: (point: WhiteboardWorldPoint) => void;
  resetViewOnWorldPoint: (point: WhiteboardWorldPoint) => void;
  fitWorldBounds: (bounds: WhiteboardWorldBounds, fallbackPoint?: WhiteboardWorldPoint) => void;
}

const INITIAL_VIEWPORT_STATE: WhiteboardViewportState = {
  camera: WHITEBOARD_CAMERA_DEFAULT,
  zoom: WHITEBOARD_ZOOM_DEFAULT,
};

/**
 * 历史文件名沿用 1.1.4；1.1.5 起这里统一 owner ephemeral zoom + camera。
 * camera/zoom 都不接 WhiteboardStore，因此 Pan/Zoom pointermove 不会写 Vault。
 */
export function useWhiteboardViewportController(
  viewportRef: { current: HTMLDivElement | null },
): WhiteboardViewportController {
  const [state, setState] = useState<WhiteboardViewportState>(INITIAL_VIEWPORT_STATE);
  const [panning, setPanning] = useState(false);
  const stateRef = useRef(state);
  const panSessionRef = useRef<WhiteboardPanSession | null>(null);
  const panTargetRef = useRef<HTMLElement | null>(null);
  const panCleanupRef = useRef<(() => void) | null>(null);
  stateRef.current = state;

  const updateState = useCallback((resolve: (current: WhiteboardViewportState) => WhiteboardViewportState) => {
    setState((current) => {
      const next = resolve(current);
      stateRef.current = next;
      return next;
    });
  }, []);

  const clearPanListeners = useCallback(() => {
    panCleanupRef.current?.();
    panCleanupRef.current = null;
  }, []);

  const finishPan = useCallback((event: PointerEvent) => {
    const session = panSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.stopPropagation();
    panSessionRef.current = null;
    clearPanListeners();
    try { panTargetRef.current?.releasePointerCapture?.(event.pointerId); } catch { /* host may already release capture */ }
    panTargetRef.current = null;
    setPanning(false);
  }, [clearPanListeners]);

  const beginPan = useCallback((event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 1) return;
    event.preventDefault();
    event.stopPropagation();
    clearPanListeners();
    const current = stateRef.current;
    panSessionRef.current = createWhiteboardPanSession({
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      camera: current.camera,
      zoom: current.zoom,
    });
    const target = event.currentTarget as HTMLElement;
    panTargetRef.current = target;
    try { target.setPointerCapture?.(event.pointerId); } catch { /* optional in host */ }
    setPanning(true);

    const move = (nextEvent: PointerEvent) => {
      const session = panSessionRef.current;
      if (!session || session.pointerId !== nextEvent.pointerId) return;
      nextEvent.preventDefault();
      nextEvent.stopPropagation();
      const camera = resolveWhiteboardPannedCamera(session, nextEvent.clientX, nextEvent.clientY);
      updateState((latest) => ({ ...latest, camera }));
    };
    const up = (nextEvent: PointerEvent) => finishPan(nextEvent);
    const cancel = (nextEvent: PointerEvent) => finishPan(nextEvent);
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', cancel, true);
    panCleanupRef.current = () => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', cancel, true);
    };
  }, [clearPanListeners, finishPan, updateState]);

  useEffect(() => () => {
    clearPanListeners();
    panSessionRef.current = null;
    panTargetRef.current = null;
  }, [clearPanListeners]);

  const applyZoom = useCallback((nextValue: number, anchor?: { clientX: number; clientY: number }) => {
    const viewport = viewportRef.current;
    updateState((current) => {
      const nextZoom = clampWhiteboardZoom(nextValue);
      if (nextZoom === current.zoom) return current;
      const rect = viewport?.getBoundingClientRect();
      const anchorOffsetX = anchor && rect ? anchor.clientX - rect.left : (viewport?.clientWidth ?? 0) / 2;
      const anchorOffsetY = anchor && rect ? anchor.clientY - rect.top : (viewport?.clientHeight ?? 0) / 2;
      return {
        zoom: nextZoom,
        camera: resolveWhiteboardZoomedCamera({
          camera: current.camera,
          currentZoom: current.zoom,
          nextZoom,
          anchorOffsetX,
          anchorOffsetY,
        }),
      };
    });
  }, [updateState, viewportRef]);

  const zoomIn = useCallback(() => applyZoom(stepWhiteboardZoom(stateRef.current.zoom, 1)), [applyZoom]);
  const zoomOut = useCallback(() => applyZoom(stepWhiteboardZoom(stateRef.current.zoom, -1)), [applyZoom]);
  const resetZoom = useCallback(() => applyZoom(WHITEBOARD_ZOOM_DEFAULT), [applyZoom]);

  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.ctrlKey || event.metaKey) {
      applyZoom(resolveWhiteboardWheelZoom(stateRef.current.zoom, event.deltaY), event);
      return;
    }
    const current = stateRef.current;
    const useShiftForHorizontal = event.shiftKey && event.deltaX === 0;
    const deltaX = useShiftForHorizontal ? event.deltaY : event.deltaX;
    const deltaY = useShiftForHorizontal ? 0 : event.deltaY;
    const camera = resolveWhiteboardWheelPannedCamera(current.camera, deltaX, deltaY, current.zoom);
    updateState((latest) => ({ ...latest, camera }));
  }, [applyZoom, updateState]);

  const centerOnWorldPoint = useCallback((point: WhiteboardWorldPoint) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const current = stateRef.current;
    const camera = centerWhiteboardCameraOnWorldPoint({
      point,
      viewportWidth: viewport.clientWidth,
      viewportHeight: viewport.clientHeight,
      zoom: current.zoom,
    });
    updateState((latest) => ({ ...latest, camera }));
  }, [updateState, viewportRef]);

  const resetViewOnWorldPoint = useCallback((point: WhiteboardWorldPoint) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const camera = centerWhiteboardCameraOnWorldPoint({
      point,
      viewportWidth: viewport.clientWidth,
      viewportHeight: viewport.clientHeight,
      zoom: WHITEBOARD_ZOOM_DEFAULT,
    });
    updateState(() => ({ camera, zoom: WHITEBOARD_ZOOM_DEFAULT }));
  }, [updateState, viewportRef]);

  const fitWorldBounds = useCallback((bounds: WhiteboardWorldBounds, fallbackPoint?: WhiteboardWorldPoint) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const next = fitWhiteboardBoundsToViewport({
      bounds,
      viewportWidth: viewport.clientWidth,
      viewportHeight: viewport.clientHeight,
      padding: 56,
      maxZoom: WHITEBOARD_ZOOM_DEFAULT,
    });
    const fits = bounds.width * next.zoom <= Math.max(1, viewport.clientWidth - 112) + 1
      && bounds.height * next.zoom <= Math.max(1, viewport.clientHeight - 112) + 1;
    if (!fits && fallbackPoint) next.camera = centerWhiteboardCameraOnWorldPoint({
      point: fallbackPoint, viewportWidth: viewport.clientWidth, viewportHeight: viewport.clientHeight, zoom: next.zoom,
    });
    updateState(() => next);
  }, [updateState, viewportRef]);

  return {
    camera: state.camera,
    zoom: state.zoom,
    panning,
    worldTransform: getWhiteboardWorldTransform(state.camera, state.zoom),
    gridStyle: getWhiteboardGridStyle(state.camera, state.zoom),
    zoomIn,
    zoomOut,
    resetZoom,
    handleWheel,
    beginPan,
    centerOnWorldPoint,
    resetViewOnWorldPoint,
    fitWorldBounds,
  };
}
