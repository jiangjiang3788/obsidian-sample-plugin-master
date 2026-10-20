// src/core/hooks/useTimelineZoom.ts
import { useState, useCallback, useRef, useEffect } from 'preact/hooks';

interface UseTimelineZoomOptions {
  defaultHeight: number;
  minHeight?: number;
  maxHeight?: number;
  step?: number;
}

interface PointerPosition { x: number; y: number }
interface PinchSnapshot { distance: number; hourHeight: number }

/**
 * Ruler zoom uses POINTER events for a two-finger pinch, rather than competing
 * touchmove/preventDefault handlers on the same surface as scrolling and edits.
 * A one-finger gesture is always left to native scrolling. This also lets
 * TouchCancel on iOS/Android end a pinch without a leaked interaction state.
 */
export function useTimelineZoom(options: UseTimelineZoomOptions) {
  const { defaultHeight, minHeight = 10, maxHeight = 200, step = 5 } = options;
  const [hourHeight, setHourHeight] = useState(defaultHeight);
  const pointersRef = useRef<Map<number, PointerPosition>>(new Map());
  const pinchRef = useRef<PinchSnapshot | null>(null);

  useEffect(() => { setHourHeight(defaultHeight); }, [defaultHeight]);
  useEffect(() => () => { pointersRef.current.clear(); pinchRef.current = null; }, []);

  const distanceBetweenPointers = () => {
    const positions = [...pointersRef.current.values()];
    if (positions.length !== 2) return null;
    return Math.hypot(positions[0].x - positions[1].x, positions[0].y - positions[1].y);
  };

  const handleWheel = useCallback((event: WheelEvent) => {
    if (!event.altKey) return;
    event.preventDefault();
    setHourHeight((current) => Math.max(minHeight, Math.min(maxHeight,
      current + (event.deltaY < 0 ? step : -step))));
  }, [minHeight, maxHeight, step]);

  const handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      const distance = distanceBetweenPointers();
      pinchRef.current = distance && distance > 0 ? { distance, hourHeight } : null;
    } else if (pointersRef.current.size > 2) pinchRef.current = null;
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size !== 2 || !pinchRef.current) return;
    const distance = distanceBetweenPointers();
    if (distance == null) return;
    const scaled = pinchRef.current.hourHeight * distance / pinchRef.current.distance;
    setHourHeight(Math.max(minHeight, Math.min(maxHeight, scaled)));
    // No preventDefault: the browser owns native scroll/cancel behavior.
  };

  const handlePointerEnd = (event: PointerEvent) => {
    pointersRef.current.delete(event.pointerId);
    pinchRef.current = null;
  };

  const zoomToMax = useCallback(() => setHourHeight(maxHeight), [maxHeight]);

  return {
    hourHeight,
    maxHourHeight: maxHeight,
    zoomToMax,
    zoomHandlers: {
      onWheel: handleWheel as any,
      onPointerDown: handlePointerDown as any,
      onPointerMove: handlePointerMove as any,
      onPointerUp: handlePointerEnd as any,
      onPointerCancel: handlePointerEnd as any,
    },
  };
}
