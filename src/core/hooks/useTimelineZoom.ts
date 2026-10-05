// src/core/hooks/useTimelineZoom.ts
import { useState, useCallback, useRef, useEffect } from 'preact/hooks';

interface UseTimelineZoomOptions {
    defaultHeight: number;
    minHeight?: number;
    maxHeight?: number;
    step?: number;
}

interface TouchPointerPoint {
    x: number;
    y: number;
}

interface ActivePinchGesture {
    initialDistance: number;
    initialHourHeight: number;
}

function pointerDistance(points: Map<number, TouchPointerPoint>): number | null {
    if (points.size < 2) return null;
    const [first, second] = Array.from(points.values());
    if (!first || !second) return null;
    return Math.hypot(first.x - second.x, first.y - second.y);
}

export function useTimelineZoom(options: UseTimelineZoomOptions) {
    const {
        defaultHeight,
        minHeight = 10,
        maxHeight = 200,
        step = 5
    } = options;

    const [hourHeight, setHourHeight] = useState(defaultHeight);
    const touchPointersRef = useRef<Map<number, TouchPointerPoint>>(new Map());
    const pinchGestureRef = useRef<ActivePinchGesture | null>(null);

    useEffect(() => {
        setHourHeight(defaultHeight);
    }, [defaultHeight]);

    const clampHeight = useCallback((value: number) => (
        Math.max(minHeight, Math.min(maxHeight, value))
    ), [minHeight, maxHeight]);

    const handleWheel = useCallback((e: WheelEvent) => {
        if (!e.altKey) return;
        e.preventDefault();
        setHourHeight((currentHeight: number) => {
            const newHeight = e.deltaY < 0 ? currentHeight + step : currentHeight - step;
            return clampHeight(newHeight);
        });
    }, [clampHeight, step]);

    const handlePointerDown = useCallback((e: PointerEvent) => {
        if (e.pointerType !== 'touch') return;
        touchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        // The surface CSS deliberately allows one-finger pan but not browser
        // pinch-zoom. With two active touch pointers we can therefore implement
        // timeline zoom without a scroll-blocking TouchEvent/preventDefault path.
        if (touchPointersRef.current.size === 2) {
            const initialDistance = pointerDistance(touchPointersRef.current);
            if (initialDistance && initialDistance > 0) {
                pinchGestureRef.current = {
                    initialDistance,
                    initialHourHeight: hourHeight,
                };
            }
        } else if (touchPointersRef.current.size > 2) {
            // Do not reuse a two-pointer baseline across a three-finger gesture.
            pinchGestureRef.current = null;
        }
    }, [hourHeight]);

    const handlePointerMove = useCallback((e: PointerEvent) => {
        if (e.pointerType !== 'touch' || !touchPointersRef.current.has(e.pointerId)) return;
        touchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        const pinch = pinchGestureRef.current;
        if (!pinch || touchPointersRef.current.size !== 2) return;
        const currentDistance = pointerDistance(touchPointersRef.current);
        if (!currentDistance || pinch.initialDistance <= 0) return;

        const scale = currentDistance / pinch.initialDistance;
        setHourHeight(clampHeight(pinch.initialHourHeight * scale));
    }, [clampHeight]);

    const finishTouchPointer = useCallback((e: PointerEvent) => {
        if (e.pointerType !== 'touch') return;
        touchPointersRef.current.delete(e.pointerId);
        if (touchPointersRef.current.size !== 2) {
            pinchGestureRef.current = null;
            return;
        }

        // If a three-finger gesture returns to exactly two touches, establish a
        // fresh baseline instead of jumping against the stale original pair.
        const initialDistance = pointerDistance(touchPointersRef.current);
        pinchGestureRef.current = initialDistance && initialDistance > 0
            ? { initialDistance, initialHourHeight: hourHeight }
            : null;
    }, [hourHeight]);

    const zoomToMax = useCallback(() => {
        setHourHeight(maxHeight);
    }, [maxHeight]);

    return {
        hourHeight,
        maxHourHeight: maxHeight,
        zoomToMax,
        zoomHandlers: {
            onWheel: handleWheel as any,
            onPointerDown: handlePointerDown as any,
            onPointerMove: handlePointerMove as any,
            onPointerUp: finishTouchPointer as any,
            onPointerCancel: finishTouchPointer as any,
        }
    };
}
