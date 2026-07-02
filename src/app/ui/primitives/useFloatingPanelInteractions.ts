import { useCallback, useRef } from 'preact/hooks';

import {
    getEventCoords,
    passiveListenerOptions,
    type FloatingPanelPosition,
    type PanelSize,
    type ResizeDirection,
} from './floatingPanelGeometry';
import { toDomListener } from './floatingPanelEvents';

type SetState<T> = (value: T | ((current: T) => T)) => void;

interface FloatingPanelInteractionsArgs {
    id: string;
    inline: boolean;
    resizable: boolean;
    position: FloatingPanelPosition;
    size: PanelSize;
    focus: (id: string) => void;
    setPosition: SetState<FloatingPanelPosition>;
    setSize: SetState<PanelSize>;
    clampPosition: (position: FloatingPanelPosition, panelSize?: PanelSize) => FloatingPanelPosition;
    clampSize: (next: PanelSize) => PanelSize;
    getEffectiveWidth: () => number;
    getEffectiveHeight: () => number;
}

export function useFloatingPanelInteractions(args: FloatingPanelInteractionsArgs) {
    const {
        id,
        inline,
        resizable,
        position,
        size,
        focus,
        setPosition,
        setSize,
        clampPosition,
        clampSize,
        getEffectiveWidth,
        getEffectiveHeight,
    } = args;

    const dragRef = useRef({ startX: 0, startY: 0, panelX: 0, panelY: 0 });
    const resizeRef = useRef({
        startX: 0,
        startY: 0,
        startWidth: 0,
        startHeight: 0,
        direction: 'corner' as ResizeDirection,
    });

    const onDragMove = useCallback((event: MouseEvent | TouchEvent) => {
        if (!(event as TouchEvent).touches) event.preventDefault();
        const coords = getEventCoords(event);
        if (!coords) return;
        const dx = coords.x - dragRef.current.startX;
        const dy = coords.y - dragRef.current.startY;
        setPosition(clampPosition({ x: dragRef.current.panelX + dx, y: dragRef.current.panelY + dy }));
    }, [clampPosition, setPosition]);

    const onDragEnd = useCallback(() => {
        window.removeEventListener('mousemove', toDomListener(onDragMove));
        window.removeEventListener('mouseup', toDomListener(onDragEnd));
        window.removeEventListener('touchmove', toDomListener(onDragMove));
        window.removeEventListener('touchend', toDomListener(onDragEnd));
    }, [onDragMove]);

    const onDragStart = useCallback((event: MouseEvent | TouchEvent) => {
        if (inline) return;
        const coords = getEventCoords(event);
        if (!coords) return;
        focus(id);
        dragRef.current = { startX: coords.x, startY: coords.y, panelX: position.x, panelY: position.y };
        window.addEventListener('mousemove', toDomListener(onDragMove));
        window.addEventListener('mouseup', toDomListener(onDragEnd));
        window.addEventListener('touchmove', toDomListener(onDragMove), passiveListenerOptions);
        window.addEventListener('touchend', toDomListener(onDragEnd), passiveListenerOptions);
    }, [inline, id, focus, position, onDragMove, onDragEnd]);

    const onResizeMove = useCallback((event: MouseEvent | TouchEvent) => {
        if (!(event as TouchEvent).touches) event.preventDefault();
        const coords = getEventCoords(event);
        if (!coords) return;

        const dx = coords.x - resizeRef.current.startX;
        const dy = coords.y - resizeRef.current.startY;
        const next: PanelSize = {};

        if (resizeRef.current.direction === 'right' || resizeRef.current.direction === 'corner') {
            next.width = resizeRef.current.startWidth + dx;
        }
        if (resizeRef.current.direction === 'bottom' || resizeRef.current.direction === 'corner') {
            next.height = resizeRef.current.startHeight + dy;
        }

        const clampedSize = clampSize(next);
        setSize((current) => ({ ...current, ...clampedSize }));
        setPosition((current) => clampPosition(current, { ...size, ...clampedSize }));
    }, [clampSize, clampPosition, setSize, setPosition, size]);

    const onResizeEnd = useCallback(() => {
        window.removeEventListener('mousemove', toDomListener(onResizeMove));
        window.removeEventListener('mouseup', toDomListener(onResizeEnd));
        window.removeEventListener('touchmove', toDomListener(onResizeMove));
        window.removeEventListener('touchend', toDomListener(onResizeEnd));
    }, [onResizeMove]);

    const onResizeStart = useCallback((direction: ResizeDirection) => (event: MouseEvent | TouchEvent) => {
        if (!resizable) return;
        const coords = getEventCoords(event);
        if (!coords) return;
        event.stopPropagation();
        focus(id);
        resizeRef.current = {
            startX: coords.x,
            startY: coords.y,
            startWidth: getEffectiveWidth(),
            startHeight: getEffectiveHeight(),
            direction,
        };
        window.addEventListener('mousemove', toDomListener(onResizeMove));
        window.addEventListener('mouseup', toDomListener(onResizeEnd));
        window.addEventListener('touchmove', toDomListener(onResizeMove), passiveListenerOptions);
        window.addEventListener('touchend', toDomListener(onResizeEnd), passiveListenerOptions);
    }, [resizable, focus, id, onResizeMove, onResizeEnd, getEffectiveWidth, getEffectiveHeight]);

    const onPanelPointerDown = useCallback(() => {
        focus(id);
    }, [id, focus]);

    return { onDragStart, onResizeStart, onPanelPointerDown };
}
