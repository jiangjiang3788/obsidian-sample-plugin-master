import type { JSX } from 'preact';

export type PanelSize = { width?: number; height?: number };
export type ResizeDirection = 'right' | 'bottom' | 'corner';
export type FloatingPanelPosition = { x: number; y: number };

export const passiveListenerOptions = { passive: true } as AddEventListenerOptions;

export function getEventCoords(e: MouseEvent | TouchEvent): FloatingPanelPosition | null {
    if (e instanceof MouseEvent) return { x: e.clientX, y: e.clientY };
    if ((e as TouchEvent).touches && (e as TouchEvent).touches.length > 0) {
        const touch = (e as TouchEvent).touches[0];
        return { x: touch.clientX, y: touch.clientY };
    }
    return null;
}

export function toCssSize(value?: number | string): string | undefined {
    return typeof value === 'number' ? `${value}px` : value;
}

export function getNumericConstraint(value: number | string | undefined, fallback?: number): number | undefined {
    if (typeof value === 'number') return value;
    return fallback;
}

export function getMobileDefaultFloatingPosition(): FloatingPanelPosition {
    return { x: 8, y: Math.max(8, window.innerHeight / 2 - 250) };
}

interface FloatingPaperStyleArgs {
    inline: boolean;
    mobile: boolean;
    position: FloatingPanelPosition;
    effectiveZIndex: number;
    minWidth?: number | string;
    maxWidth?: number | string;
    minHeight?: number | string;
    maxHeight?: number | string;
    width?: number | string;
    height?: number | string;
    size: PanelSize;
}

export function buildFloatingPanelPaperStyle(args: FloatingPaperStyleArgs): JSX.CSSProperties {
    const { inline, mobile, position, effectiveZIndex, minWidth, maxWidth, minHeight, maxHeight, width, height, size } = args;
    if (inline) {
        return {
            position: 'relative',
            left: undefined,
            top: undefined,
            zIndex: undefined,
            minWidth: 0,
            maxWidth: '100%',
            minHeight: toCssSize(minHeight),
            maxHeight: toCssSize(maxHeight),
            width: '100%',
            height: toCssSize(height),
            userSelect: 'text',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxSizing: 'border-box',
            margin: '8px 0',
        };
    }

    return {
        position: 'fixed',
        left: mobile ? '8px' : `${position.x}px`,
        top: `${position.y}px`,
        zIndex: effectiveZIndex,
        minWidth: mobile ? `${window.innerWidth - 16}px` : toCssSize(minWidth),
        maxWidth: mobile ? '100vw' : toCssSize(maxWidth),
        minHeight: toCssSize(minHeight),
        maxHeight: mobile ? 'calc(100vh - env(safe-area-inset-bottom, 16px))' : toCssSize(maxHeight),
        width: mobile ? `${window.innerWidth - 16}px` : toCssSize(size.width ?? width),
        height: toCssSize(size.height ?? height),
        userSelect: 'text',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
        paddingBottom: mobile ? 'env(safe-area-inset-bottom, 8px)' : undefined,
    };
}

export function buildFloatingPanelBodyStyle(mobile: boolean, bodyPadding: number | string, bodyStyle?: JSX.CSSProperties): JSX.CSSProperties {
    return {
        padding: mobile ? 12 : bodyPadding,
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflow: 'auto',
        boxSizing: 'border-box',
        WebkitOverflowScrolling: 'touch',
        userSelect: 'text',
        ...bodyStyle,
    };
}
