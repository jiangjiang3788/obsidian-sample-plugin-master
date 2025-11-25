// src/core/hooks/useTimelineZoom.ts
import { useState, useCallback, useRef, useEffect } from 'preact/hooks';

interface UseTimelineZoomOptions {
    defaultHeight: number;
    minHeight?: number;
    maxHeight?: number;
    step?: number;
}

export function useTimelineZoom(options: UseTimelineZoomOptions) {
    const { 
        defaultHeight, 
        minHeight = 10, 
        maxHeight = 200, 
        step = 5 
    } = options;

    const [hourHeight, setHourHeight] = useState(defaultHeight);
    const initialPinchDistanceRef = useRef<number | null>(null);
    const initialHourHeightRef = useRef<number | null>(null);

    useEffect(() => {
        setHourHeight(defaultHeight);
    }, [defaultHeight]);

    const handleWheel = useCallback((e: WheelEvent) => {
        if (!e.altKey) return;
        e.preventDefault();
        setHourHeight((currentHeight: number) => {
            const newHeight = e.deltaY < 0 ? currentHeight + step : currentHeight - step;
            return Math.max(minHeight, Math.min(maxHeight, newHeight));
        });
    }, [minHeight, maxHeight, step]);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const distance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            initialPinchDistanceRef.current = distance;
            initialHourHeightRef.current = hourHeight;
        }
    }, [hourHeight]);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (e.touches.length === 2 && initialPinchDistanceRef.current) {
            e.preventDefault();
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const currentDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            
            const scale = currentDistance / initialPinchDistanceRef.current;
            const newHeight = (initialHourHeightRef.current || defaultHeight) * scale;
            
            setHourHeight(Math.max(minHeight, Math.min(maxHeight, newHeight)));
        }
    }, [defaultHeight, minHeight, maxHeight]);

    const handleTouchEnd = useCallback(() => {
        initialPinchDistanceRef.current = null;
        initialHourHeightRef.current = null;
    }, []);

    return {
        hourHeight,
        zoomHandlers: {
            onWheel: handleWheel as any,
            onTouchStart: handleTouchStart as any,
            onTouchMove: handleTouchMove as any,
            onTouchEnd: handleTouchEnd as any
        }
    };
}
