// src/core/hooks/useTimelineZoom.ts
import { useCallback, useLayoutEffect, useRef, useState, useEffect } from 'preact/hooks';

interface UseTimelineZoomOptions {
  defaultHeight: number;
  minHeight?: number;
  maxHeight?: number;
  step?: number;
}

interface PinchSession {
  ids: [number, number];
  distance: number;
  hourHeight: number;
  midY: number;
  contentY: number;
  scrollTop: number;
  sawTouchPinchMove: boolean;
}

/** Native, *capturing* TouchEvents avoid iOS WebKit PointerCancel during pan.
 * Neither synthetic pointer IDs nor timer state can be reused across gestures.
 * Calling preventDefault is ONLY legal after a verified two-touch pinch starts. */
export function attachTimelineTouchZoom(
  surface: HTMLElement,
  getHourHeight: () => number,
  onScale: (height: number, anchor: { hourHeight: number; scrollTop: number; contentY: number; verticalPan: number }) => void,
  requestPinch: () => boolean = () => true,
): () => void {
  const localTouchIds = new Set<number>();
  let pinch: PinchSession | null = null;
  let blockedUntilRelease = false;

  const getPair = (event: TouchEvent): [Touch, Touch] | null => {
    // Global event.touches can include fingers outside this timeline. Restrict
    // both to touches which *started* in this particular timeline surface.
    if (event.touches.length !== 2 || localTouchIds.size !== 2) return null;
    const first = event.touches.item(0);
    const second = event.touches.item(1);
    return first && second && localTouchIds.has(first.identifier) && localTouchIds.has(second.identifier)
      ? [first, second] : null;
  };

  const onStart = (event: TouchEvent) => {
    // Clean missed touchend/touchcancel events: only current TouchList is truth.
    const live = new Set<number>();
    for (let i = 0; i < event.touches.length; i += 1) {
      const touch = event.touches.item(i);
      if (touch) live.add(touch.identifier);
    }
    for (const id of localTouchIds) if (!live.has(id)) localTouchIds.delete(id);
    for (let i = 0; i < event.changedTouches.length; i += 1) {
      const touch = event.changedTouches.item(i);
      if (touch) localTouchIds.add(touch.identifier);
    }
    if (event.touches.length > 2) {
      pinch = null;
      blockedUntilRelease = true;
      return;
    }
    if (pinch || blockedUntilRelease) return;
    const pair = getPair(event);
    if (!pair) return;
    const distance = Math.hypot(pair[0].clientX - pair[1].clientX, pair[0].clientY - pair[1].clientY);
    if (distance < 12) return; // A coincident touch is not a zoom gesture.
    // This gate cancels pending long presses. If a finger is already dragging
    // a time range, abort the edit but DO NOT silently convert it to zoom.
    if (!requestPinch()) {
      blockedUntilRelease = true;
      return;
    }
    const midY = (pair[0].clientY + pair[1].clientY) / 2;
    const content = surface.querySelector<HTMLElement>('.timeline-scrollable-body');
    const top = (content ?? surface).getBoundingClientRect().top;
    pinch = {
      ids: [pair[0].identifier, pair[1].identifier],
      distance,
      hourHeight: getHourHeight(),
      midY,
      contentY: midY - top,
      scrollTop: surface.scrollTop,
      sawTouchPinchMove: false,
    };
    if (event.cancelable) event.preventDefault();
  };

  const onMove = (event: TouchEvent) => {
    if (!pinch) return; // One finger always keeps native panning.
    const pair = getPair(event);
    if (!pair || !pinch.ids.includes(pair[0].identifier) || !pinch.ids.includes(pair[1].identifier)) {
      pinch = null;
      blockedUntilRelease = true;
      return;
    }
    // Compete with browser zoom only after *both* local touches are verified.
    if (event.cancelable) event.preventDefault();
    const distance = Math.hypot(pair[0].clientX - pair[1].clientX, pair[0].clientY - pair[1].clientY);
    if (Math.abs(distance - pinch.distance) < 4) return;
    pinch.sawTouchPinchMove = true;
    const ratio = distance / pinch.distance;
    const targetHeight = pinch.hourHeight * ratio;
    const currentMidY = (pair[0].clientY + pair[1].clientY) / 2;
    // Preserve the minute between fingers while the hour height changes.
    onScale(targetHeight, {
      hourHeight: pinch.hourHeight,
      scrollTop: pinch.scrollTop,
      contentY: pinch.contentY,
      verticalPan: pinch.midY - currentMidY,
    });
  };

  const onEnd = (event: TouchEvent) => {
    const live = new Set<number>();
    for (let i = 0; i < event.touches.length; i += 1) {
      const touch = event.touches.item(i);
      if (touch) live.add(touch.identifier);
    }
    for (const id of localTouchIds) if (!live.has(id)) localTouchIds.delete(id);
    if (!getPair(event)) pinch = null;
    if (event.touches.length === 0) {
      localTouchIds.clear();
      blockedUntilRelease = false;
    }
  };

  const onBrowserGesture = (event: Event) => {
    // Some iOS WebKit builds emit gesturechange while suppressing touchmove
    // after browser gesture recognition. Use its SCALE only as a fallback,
    // never add it to a TouchEvent-derived scale (which would double zoom).
    if (!pinch) return;
    if (event.cancelable) event.preventDefault();
    const scale = (event as Event & { scale?: number }).scale;
    if (event.type === 'gesturechange' && !pinch.sawTouchPinchMove
      && typeof scale === 'number' && Number.isFinite(scale)
      && Math.abs(scale - 1) * pinch.distance >= 4 && scale > 0) {
      onScale(pinch.hourHeight * scale, {
        hourHeight: pinch.hourHeight,
        scrollTop: pinch.scrollTop,
        contentY: pinch.contentY,
        verticalPan: 0,
      });
    }
  };
  const onBrowserGestureEnd = () => { pinch = null; };

  surface.addEventListener('touchstart', onStart, { capture: true, passive: false });
  surface.addEventListener('touchmove', onMove, { capture: true, passive: false });
  surface.addEventListener('touchend', onEnd, { capture: true, passive: true });
  surface.addEventListener('touchcancel', onEnd, { capture: true, passive: true });
  surface.addEventListener('gesturestart', onBrowserGesture, { capture: true, passive: false });
  surface.addEventListener('gesturechange', onBrowserGesture, { capture: true, passive: false });
  surface.addEventListener('gestureend', onBrowserGestureEnd, { capture: true, passive: true });
  return () => {
    surface.removeEventListener('touchstart', onStart, true);
    surface.removeEventListener('touchmove', onMove, true);
    surface.removeEventListener('touchend', onEnd, true);
    surface.removeEventListener('touchcancel', onEnd, true);
    surface.removeEventListener('gesturestart', onBrowserGesture, true);
    surface.removeEventListener('gesturechange', onBrowserGesture, true);
    surface.removeEventListener('gestureend', onBrowserGestureEnd, true);
    localTouchIds.clear();
    pinch = null;
  };
}

export function useTimelineZoom(options: UseTimelineZoomOptions) {
  const { defaultHeight, minHeight = 10, maxHeight = 200, step = 5 } = options;
  const [hourHeight, setHourHeight] = useState(defaultHeight);
  const hourHeightRef = useRef(hourHeight);
  hourHeightRef.current = hourHeight;
  const pendingScrollRef = useRef<{ surface: HTMLElement; top: number } | null>(null);

  useEffect(() => { setHourHeight(defaultHeight); }, [defaultHeight]);
  useLayoutEffect(() => {
    const pending = pendingScrollRef.current;
    if (!pending) return;
    pendingScrollRef.current = null;
    pending.surface.scrollTop = Math.max(0, pending.top);
  }, [hourHeight]);
  useEffect(() => () => { pendingScrollRef.current = null; }, []);

  const handleWheel = useCallback((event: WheelEvent) => {
    if (!event.altKey) return;
    event.preventDefault();
    setHourHeight((current) => Math.max(minHeight, Math.min(maxHeight,
      current + (event.deltaY < 0 ? step : -step))));
  }, [minHeight, maxHeight, step]);

  const bindTouchSurface = useCallback((surface: HTMLElement, requestPinch: () => boolean): (() => void) =>
    attachTimelineTouchZoom(surface, () => hourHeightRef.current, (requestedHeight, anchor) => {
      const clamped = Math.max(minHeight, Math.min(maxHeight, requestedHeight));
      // Anchor the minute between fingers to the same screen position, even
      // when reaching min/max zoom or moving the pinch midpoint vertically.
      const desiredTop = Math.max(0, anchor.scrollTop
        + anchor.contentY * (clamped / anchor.hourHeight - 1)
        + anchor.verticalPan);
      if (clamped === hourHeightRef.current) {
        surface.scrollTop = desiredTop;
      } else {
        pendingScrollRef.current = { surface, top: desiredTop };
        setHourHeight(clamped);
      }
    }, requestPinch), [minHeight, maxHeight]);

  const zoomToMax = useCallback(() => setHourHeight(maxHeight), [maxHeight]);
  return {
    hourHeight,
    maxHourHeight: maxHeight,
    zoomToMax,
    zoomHandlers: { onWheel: handleWheel, bindTouchSurface },
  };
}
