/**
 * FloatingPanel - 统一的可拖拽悬浮窗容器（Portal）
 *
 * ✅ 统一能力：
 * - mouse/touch 拖拽
 * - localStorage 位置持久化（按 id）
 * - localStorage 尺寸持久化（按 id）
 * - 点击外部关闭（可选）
 * - ESC 关闭（可选，且默认只关闭“当前聚焦”的浮窗）
 * - 通过 Zustand 共享 zIndex / activeId（悬浮窗之间共享状态）
 * - 右侧 / 底部 / 右下角拖拽调节大小（可选）
 */
/** @jsxImportSource preact */

import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef, useState, useCallback, useMemo } from 'preact/hooks';
import { Paper } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { createPortal } from 'preact/compat';

import { useLocalStorage } from '@shared/public';
import {
    makeSelectFloatingWindowZIndex,
    selectFloatingWindowsActiveId,
    selectFloatingWindowsFocus,
    selectFloatingWindowsRegister,
    selectFloatingWindowsUnregister,
    useSelector,
} from '@/app/public';

const getEventCoords = (e: MouseEvent | TouchEvent) => {
    if (e instanceof MouseEvent) return { x: e.clientX, y: e.clientY };
    if ((e as TouchEvent).touches && (e as TouchEvent).touches.length > 0) {
        const t = (e as TouchEvent).touches[0];
        return { x: t.clientX, y: t.clientY };
    }
    return null;
};

type PanelSize = { width?: number; height?: number };
type ResizeDirection = 'right' | 'bottom' | 'corner';

const toCssSize = (value?: number | string) => (typeof value === 'number' ? `${value}px` : value);

const getNumericConstraint = (value: number | string | undefined, fallback?: number) => {
    if (typeof value === 'number') return value;
    return fallback;
};

export interface FloatingPanelProps {
    /** 唯一 id：用于 localStorage & zIndex 管理 */
    id: string;
    /** 默认位置（若 localStorage 有记录将被覆盖） */
    defaultPosition?: { x: number; y: number };

    /** 尺寸约束（透传到 Paper style） */
    minWidth?: number | string;
    maxWidth?: number | string;
    minHeight?: number | string;
    maxHeight?: number | string;
    width?: number | string;
    height?: number | string;

    /** 可调大小 */
    resizable?: boolean;

    /** 头部 */
    title?: ComponentChildren;
    headerActions?: ComponentChildren;
    showHeader?: boolean;

    /** 内容 */
    children: ComponentChildren;
    bodyPadding?: number | string;
    bodyStyle?: JSX.CSSProperties;

    /** 可见性（计时器可用：只隐藏不销毁 widget） */
    visible?: boolean;

    /** 关闭行为 */
    onClose?: () => void;
    closeOnOutsideClick?: boolean;
    closeOnEscape?: boolean;

    /** 兜底 zIndex（通常不需要传，交给 Zustand 管理） */
    zIndex?: number;
}

export function FloatingPanel({
    id,
    defaultPosition = { x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 150 },
    minWidth = 320,
    maxWidth,
    minHeight,
    maxHeight,
    width,
    height,
    resizable = false,
    title,
    headerActions,
    showHeader = true,
    children,
    bodyPadding = 8,
    bodyStyle,
    visible = true,
    onClose,
    closeOnOutsideClick = true,
    closeOnEscape = true,
    zIndex = 9999,
}: FloatingPanelProps) {
    const register = useSelector(selectFloatingWindowsRegister);
    const unregister = useSelector(selectFloatingWindowsUnregister);
    const focus = useSelector(selectFloatingWindowsFocus);
    const activeId = useSelector(selectFloatingWindowsActiveId);
    const managedZIndex = useSelector(makeSelectFloatingWindowZIndex(id));
    const effectiveZIndex = managedZIndex ?? zIndex;

    const positionStorageKey = `think-floating-pos-${id}`;
    const sizeStorageKey = `think-floating-size-${id}`;

    const [storedPosition, setStoredPosition] = useLocalStorage(positionStorageKey, defaultPosition);
    const [position, setPosition] = useState<{ x: number; y: number }>(storedPosition || defaultPosition);

    const initialSize = useMemo<PanelSize>(() => ({
        width: typeof width === 'number' ? width : undefined,
        height: typeof height === 'number' ? height : undefined,
    }), [width, height]);
    const [storedSize, setStoredSize] = useLocalStorage(sizeStorageKey, initialSize);
    const [size, setSize] = useState<PanelSize>(storedSize || initialSize);

    const dragRef = useRef({ startX: 0, startY: 0, panelX: 0, panelY: 0 });
    const resizeRef = useRef({
        startX: 0,
        startY: 0,
        startWidth: 0,
        startHeight: 0,
        direction: 'corner' as ResizeDirection,
    });
    const rootRef = useRef<HTMLDivElement | null>(null);

    const minWidthPx = getNumericConstraint(minWidth, 320) ?? 320;
    const minHeightPx = getNumericConstraint(minHeight, 160) ?? 160;
    const maxWidthPx = getNumericConstraint(maxWidth, window.innerWidth - 16);
    const maxHeightPx = getNumericConstraint(maxHeight, window.innerHeight - 16);

    const getEffectiveWidth = useCallback(() => {
        if (typeof size.width === 'number') return size.width;
        if (typeof width === 'number') return width;
        if (typeof minWidth === 'number') return minWidth;
        return 320;
    }, [size.width, width, minWidth]);

    const getEffectiveHeight = useCallback(() => {
        if (typeof size.height === 'number') return size.height;
        if (typeof height === 'number') return height;
        if (typeof minHeight === 'number') return minHeight;
        return 220;
    }, [size.height, height, minHeight]);

    const clampSize = useCallback((next: PanelSize): PanelSize => {
        const clamped: PanelSize = { ...next };

        if (typeof next.width === 'number') {
            clamped.width = Math.min(Math.max(next.width, minWidthPx), maxWidthPx);
        }
        if (typeof next.height === 'number') {
            clamped.height = Math.min(Math.max(next.height, minHeightPx), maxHeightPx);
        }
        return clamped;
    }, [minWidthPx, maxWidthPx, minHeightPx, maxHeightPx]);

    const clampPosition = useCallback((pos: { x: number; y: number }, panelSize?: PanelSize) => {
        const currentWidth = typeof panelSize?.width === 'number' ? panelSize.width : getEffectiveWidth();
        const currentHeight = typeof panelSize?.height === 'number' ? panelSize.height : getEffectiveHeight();
        const maxX = Math.max(0, window.innerWidth - currentWidth);
        const maxY = Math.max(0, window.innerHeight - Math.min(currentHeight, window.innerHeight - 16));
        return {
            x: Math.min(Math.max(0, pos.x), maxX),
            y: Math.min(Math.max(0, pos.y), maxY),
        };
    }, [getEffectiveWidth, getEffectiveHeight]);

    useEffect(() => {
        if (!visible) {
            unregister(id);
            return;
        }
        register(id);
        return () => unregister(id);
    }, [id, visible, register, unregister]);

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
    }, [size, position, clampSize, clampPosition]);

    useEffect(() => {
        if (!onClose || !closeOnOutsideClick || !visible) return;

        const ignoreFirstClick = { current: true } as { current: boolean };
        const handler = (e: MouseEvent | TouchEvent) => {
            if (ignoreFirstClick.current) return;
            if (!rootRef.current) return;
            if (e.target instanceof Node && !rootRef.current.contains(e.target)) {
                onClose();
            }
        };

        const bindTimer = window.setTimeout(() => {
            document.addEventListener('mousedown', handler as any);
            document.addEventListener('touchstart', handler as any);
        }, 0);
        const clearIgnoreTimer = window.setTimeout(() => {
            ignoreFirstClick.current = false;
        }, 50);

        return () => {
            clearTimeout(bindTimer);
            clearTimeout(clearIgnoreTimer);
            document.removeEventListener('mousedown', handler as any);
            document.removeEventListener('touchstart', handler as any);
        };
    }, [onClose, closeOnOutsideClick, visible]);

    useEffect(() => {
        if (!onClose || !closeOnEscape || !visible) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (activeId && activeId !== id) return;
            onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onClose, closeOnEscape, visible, activeId, id]);

    useEffect(() => {
        setStoredPosition(position);
    }, [position, setStoredPosition]);

    useEffect(() => {
        if (!resizable) return;
        setStoredSize(size);
    }, [size, resizable, setStoredSize]);

    const onDragMove = useCallback((e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        const coords = getEventCoords(e);
        if (!coords) return;
        const dx = coords.x - dragRef.current.startX;
        const dy = coords.y - dragRef.current.startY;
        setPosition(clampPosition({ x: dragRef.current.panelX + dx, y: dragRef.current.panelY + dy }));
    }, [clampPosition]);

    const onDragEnd = useCallback(() => {
        window.removeEventListener('mousemove', onDragMove as any);
        window.removeEventListener('mouseup', onDragEnd as any);
        window.removeEventListener('touchmove', onDragMove as any);
        window.removeEventListener('touchend', onDragEnd as any);
    }, [onDragMove]);

    const onDragStart = useCallback((e: MouseEvent | TouchEvent) => {
        const coords = getEventCoords(e);
        if (!coords) return;
        focus(id);
        dragRef.current = { startX: coords.x, startY: coords.y, panelX: position.x, panelY: position.y };
        window.addEventListener('mousemove', onDragMove as any);
        window.addEventListener('mouseup', onDragEnd as any);
        window.addEventListener('touchmove', onDragMove as any, { passive: false } as any);
        window.addEventListener('touchend', onDragEnd as any);
    }, [id, focus, position, onDragMove, onDragEnd]);

    const onResizeMove = useCallback((e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        const coords = getEventCoords(e);
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
    }, [clampSize, clampPosition, size]);

    const onResizeEnd = useCallback(() => {
        window.removeEventListener('mousemove', onResizeMove as any);
        window.removeEventListener('mouseup', onResizeEnd as any);
        window.removeEventListener('touchmove', onResizeMove as any);
        window.removeEventListener('touchend', onResizeEnd as any);
    }, [onResizeMove]);

    const onResizeStart = useCallback((direction: ResizeDirection) => (e: MouseEvent | TouchEvent) => {
        if (!resizable) return;
        const coords = getEventCoords(e);
        if (!coords) return;
        e.stopPropagation();
        focus(id);
        resizeRef.current = {
            startX: coords.x,
            startY: coords.y,
            startWidth: getEffectiveWidth(),
            startHeight: getEffectiveHeight(),
            direction,
        };
        window.addEventListener('mousemove', onResizeMove as any);
        window.addEventListener('mouseup', onResizeEnd as any);
        window.addEventListener('touchmove', onResizeMove as any, { passive: false } as any);
        window.addEventListener('touchend', onResizeEnd as any);
    }, [resizable, focus, id, onResizeMove, onResizeEnd, getEffectiveWidth, getEffectiveHeight]);

    const onPanelPointerDown = useCallback(() => {
        focus(id);
    }, [id, focus]);

    if (!visible) return null;

    const paperStyle: JSX.CSSProperties = {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: effectiveZIndex,
        minWidth: toCssSize(minWidth),
        maxWidth: toCssSize(maxWidth),
        minHeight: toCssSize(minHeight),
        maxHeight: toCssSize(maxHeight),
        width: toCssSize(size.width ?? width),
        height: toCssSize(size.height ?? height),
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
    };

    const bodyMergedStyle: JSX.CSSProperties = {
        padding: bodyPadding,
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflow: 'auto',
        boxSizing: 'border-box',
        ...bodyStyle,
    };

    const resizeHandleBase: JSX.CSSProperties = {
        position: 'absolute',
        zIndex: effectiveZIndex + 1,
    };

    const panel = (
        <div ref={rootRef}>
            <Paper
                elevation={4}
                onMouseDown={onPanelPointerDown as any}
                onTouchStart={onPanelPointerDown as any}
                style={paperStyle}
            >
                {showHeader && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '6px 8px',
                            borderBottom: '1px solid var(--background-modifier-border)',
                            gap: 8,
                            flexShrink: 0,
                            minWidth: 0,
                        }}
                    >
                        <div
                            onMouseDown={onDragStart as any}
                            onTouchStart={onDragStart as any}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                cursor: 'move',
                                flex: 1,
                                minWidth: 0,
                            }}
                        >
                            <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                                <DragIndicatorIcon sx={{ color: 'text.disabled', fontSize: '1.2rem' }} />
                            </div>
                            {title && (
                                <div
                                    style={{
                                        flex: 1,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        fontWeight: 600,
                                    }}
                                >
                                    {title}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            {headerActions}
                            {onClose && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClose();
                                    }}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
                                    aria-label="Close"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div style={bodyMergedStyle}>{children}</div>

                {resizable && (
                    <>
                        <div
                            onMouseDown={onResizeStart('right') as any}
                            onTouchStart={onResizeStart('right') as any}
                            style={{
                                ...resizeHandleBase,
                                top: 0,
                                right: 0,
                                width: '10px',
                                height: '100%',
                                cursor: 'ew-resize',
                            }}
                        />
                        <div
                            onMouseDown={onResizeStart('bottom') as any}
                            onTouchStart={onResizeStart('bottom') as any}
                            style={{
                                ...resizeHandleBase,
                                left: 0,
                                bottom: 0,
                                width: '100%',
                                height: '10px',
                                cursor: 'ns-resize',
                            }}
                        />
                        <div
                            onMouseDown={onResizeStart('corner') as any}
                            onTouchStart={onResizeStart('corner') as any}
                            style={{
                                ...resizeHandleBase,
                                right: 0,
                                bottom: 0,
                                width: '18px',
                                height: '18px',
                                cursor: 'nwse-resize',
                                background: 'linear-gradient(135deg, transparent 0 45%, var(--text-faint) 45% 55%, transparent 55% 100%)',
                            }}
                        />
                    </>
                )}
            </Paper>
        </div>
    );

    return createPortal(panel, document.body);
}

export default FloatingPanel;
