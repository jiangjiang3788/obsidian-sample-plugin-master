import { useEffect } from 'preact/hooks';

import type { PanelSize, FloatingPanelPosition } from './floatingPanelGeometry';
import { passiveListenerOptions } from './floatingPanelGeometry';
import { toDomListener } from './floatingPanelEvents';

type SetState<T> = (value: T | ((current: T) => T)) => void;

interface FloatingPanelRegistrationArgs {
    id: string;
    visible: boolean;
    register: (id: string) => void;
    unregister: (id: string) => void;
}

export function useFloatingPanelRegistration({ id, visible, register, unregister }: FloatingPanelRegistrationArgs): void {
    useEffect(() => {
        if (!visible) {
            unregister(id);
            return;
        }
        register(id);
        return () => unregister(id);
    }, [id, visible, register, unregister]);
}

interface FloatingPanelViewportClampArgs {
    size: PanelSize;
    position: FloatingPanelPosition;
    clampSize: (next: PanelSize) => PanelSize;
    clampPosition: (position: FloatingPanelPosition, panelSize?: PanelSize) => FloatingPanelPosition;
    setSize: SetState<PanelSize>;
    setPosition: SetState<FloatingPanelPosition>;
}

export function useFloatingPanelViewportClamp(args: FloatingPanelViewportClampArgs): void {
    const { size, position, clampSize, clampPosition, setSize, setPosition } = args;

    useEffect(() => {
        const clampedSize = clampSize(size);
        if (clampedSize.width !== size.width || clampedSize.height !== size.height) {
            setSize(clampedSize);
            return;
        }

        const clampedPosition = clampPosition(position, clampedSize);
        if (clampedPosition.x !== position.x || clampedPosition.y !== position.y) {
            setPosition(clampedPosition);
        }

        const onResize = () => {
            setSize((current) => clampSize(current));
            setPosition((current) => clampPosition(current));
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [size, position, clampSize, clampPosition, setSize, setPosition]);
}

interface FloatingPanelCloseHandlerArgs {
    id: string;
    activeId?: string | null;
    visible: boolean;
    onClose?: () => void;
    closeOnOutsideClick: boolean;
    closeOnEscape: boolean;
    rootRef: { current: HTMLDivElement | null };
}

export function useFloatingPanelCloseHandlers(args: FloatingPanelCloseHandlerArgs): void {
    const { id, activeId, visible, onClose, closeOnOutsideClick, closeOnEscape, rootRef } = args;

    useEffect(() => {
        if (!onClose || !closeOnOutsideClick || !visible) return;

        const ignoreFirstClick = { current: true };
        const handler = (event: MouseEvent | TouchEvent) => {
            if (ignoreFirstClick.current) return;
            if (!rootRef.current) return;
            if (event.target instanceof Node && !rootRef.current.contains(event.target)) {
                onClose();
            }
        };

        const bindTimer = window.setTimeout(() => {
            document.addEventListener('mousedown', toDomListener(handler));
            document.addEventListener('touchstart', toDomListener(handler), passiveListenerOptions);
        }, 0);
        const clearIgnoreTimer = window.setTimeout(() => {
            ignoreFirstClick.current = false;
        }, 50);

        return () => {
            clearTimeout(bindTimer);
            clearTimeout(clearIgnoreTimer);
            document.removeEventListener('mousedown', toDomListener(handler));
            document.removeEventListener('touchstart', toDomListener(handler));
        };
    }, [onClose, closeOnOutsideClick, visible, rootRef]);

    useEffect(() => {
        if (!onClose || !closeOnEscape || !visible) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (activeId && activeId !== id) return;
            onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onClose, closeOnEscape, visible, activeId, id]);
}

interface FloatingPanelPersistenceArgs {
    position: FloatingPanelPosition;
    size: PanelSize;
    resizable: boolean;
    setStoredPosition: (position: FloatingPanelPosition) => void;
    setStoredSize: (size: PanelSize) => void;
}

export function useFloatingPanelPersistence(args: FloatingPanelPersistenceArgs): void {
    const { position, size, resizable, setStoredPosition, setStoredSize } = args;

    useEffect(() => {
        setStoredPosition(position);
    }, [position, setStoredPosition]);

    useEffect(() => {
        if (!resizable) return;
        setStoredSize(size);
    }, [size, resizable, setStoredSize]);
}
