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

    /**
     * 是否使用 Portal 挂到 document.body。
     * 默认 true，适合普通悬浮窗。
     * 在 Obsidian 设置页内编辑输入框时，body portal 可能被设置页/Tabs 的焦点管理当作“外部区域”，
     * 导致 input focusin 后立刻 focusout 并把焦点还给 settings tab。
     * 这种场景传 false，让 fixed 面板仍然显示为悬浮窗，但 DOM 留在当前设置页焦点作用域内。
     */
    portal?: boolean;

    /** 自定义 Portal 容器；仅 portal=true 时有效。 */
    portalContainer?: Element | null;

    /**
     * 布局模式。
     * - floating: fixed 定位、可拖拽，可作为真正悬浮窗。
     * - inline: 作为设置页内部面板渲染，宽度跟随父容器，不拖拽、不使用 fixed。
     *
     * 主题模板编辑器应使用 inline，避免 body portal/fixed 面板和 Obsidian Settings/Tabs 焦点管理冲突，
     * 也避免手机端超出设置页宽高。
     */
    placement?: 'floating' | 'inline';
}

const isMobile = (): boolean => {
    if (typeof window === 'undefined') return false;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent)
        || (window.matchMedia?.('(pointer: coarse)').matches ?? false)
        || window.innerWidth <= 820;
};

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
    portal = true,
    portalContainer,
    placement = 'floating',
}: FloatingPanelProps) {
    const mobile = useMemo(() => isMobile(), []);
    const inline = placement === 'inline';

    const register = useSelector(selectFloatingWindowsRegister);
    const unregister = useSelector(selectFloatingWindowsUnregister);
    const focus = useSelector(selectFloatingWindowsFocus);
    const activeId = useSelector(selectFloatingWindowsActiveId);
    const managedZIndex = useSelector(makeSelectFloatingWindowZIndex(id));
    const effectiveZIndex = managedZIndex ?? zIndex;

    const mobileDefaultPosition = useMemo(() => ({
        x: 8,
        y: Math.max(8, window.innerHeight / 2 - 250),
    }), []);

    const positionStorageKey = `think-floating-pos-${id}`;
    const sizeStorageKey = `think-floating-size-${id}`;

    const [storedPosition, setStoredPosition] = useLocalStorage(positionStorageKey, mobile ? mobileDefaultPosition : defaultPosition);
    const [position, setPosition] = useState<{ x: number; y: number }>(() => {
        if (mobile) return mobileDefaultPosition;
        return storedPosition || defaultPosition;
    });

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

    const mobileMinWidthPx = mobile ? (window.innerWidth - 16) : undefined;
    const minWidthPx = mobileMinWidthPx ?? getNumericConstraint(minWidth, 320) ?? 320;
    const minHeightPx = getNumericConstraint(minHeight, 160) ?? 160;
    const maxWidthPx = mobile ? (window.innerWidth - 16) : (getNumericConstraint(maxWidth, window.innerWidth - 16) ?? window.innerWidth - 16);
    const maxHeightPx = getNumericConstraint(maxHeight, window.innerHeight - 16) ?? window.innerHeight - 16;

    const getEffectiveWidth = useCallback(() => {
        if (mobile) return window.innerWidth - 16;
        if (typeof size.width === 'number') return size.width;
        if (typeof width === 'number') return width;
        if (typeof minWidth === 'number') return minWidth;
        return 320;
    }, [mobile, size.width, width, minWidth]);

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
        const maxY = Math.max(0, window.innerHeight - Math.min(currentHeight, window.innerHeight - 32));
        return {
            x: Math.min(Math.max(mobile ? 8 : 0, pos.x), maxX),
            y: Math.min(Math.max(mobile ? 8 : 0, pos.y), maxY),
        };
    }, [getEffectiveWidth, getEffectiveHeight, mobile]);

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
        if (inline) return;
        const coords = getEventCoords(e);
        if (!coords) return;
        focus(id);
        dragRef.current = { startX: coords.x, startY: coords.y, panelX: position.x, panelY: position.y };
        window.addEventListener('mousemove', onDragMove as any);
        window.addEventListener('mouseup', onDragEnd as any);
        window.addEventListener('touchmove', onDragMove as any, { passive: false } as any);
        window.addEventListener('touchend', onDragEnd as any);
    }, [inline, id, focus, position, onDragMove, onDragEnd]);

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

    if (typeof console !== 'undefined') {
        console.log('[FloatingPanel][portal-mode]', { id, portal, placement, portalTarget: portal ? (portalContainer ? 'custom' : 'document.body') : 'inline' });
    }

    const paperStyle: JSX.CSSProperties = inline ? {
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
    } : {
        position: 'fixed',
        left: mobile ? '8px' : `${position.x}px`,
        top: `${position.y}px`,
        zIndex: effectiveZIndex,
        minWidth: mobile ? `${window.innerWidth - 16}px` : toCssSize(minWidth),
        maxWidth: mobile ? '100vw' : toCssSize(maxWidth),
        minHeight: toCssSize(minHeight),
        maxHeight: mobile ? `calc(100vh - env(safe-area-inset-bottom, 16px))` : toCssSize(maxHeight),
        width: mobile ? `${window.innerWidth - 16}px` : toCssSize(size.width ?? width),
        height: toCssSize(size.height ?? height),
        // 不要在整个悬浮窗上禁用文本选择，否则输入框/textarea 在 Obsidian + Preact/MUI 下可能出现能聚焦但无法正常编辑/选择的问题。
        // 只在标题拖拽区禁用选择，正文区域允许文本输入和选择。
        userSelect: 'text',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
        paddingBottom: mobile ? 'env(safe-area-inset-bottom, 8px)' : undefined,
    };

    const bodyMergedStyle: JSX.CSSProperties = {
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

    const resizeHandleBase: JSX.CSSProperties = {
        position: 'absolute',
        zIndex: 1,
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
                            padding: mobile ? '10px 12px' : '6px 8px',
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
                                cursor: inline ? 'default' : 'move',
                                userSelect: 'none',
                                flex: 1,
                                minWidth: 0,
                                minHeight: mobile ? '44px' : undefined,
                            }}
                        >
                            {!inline && <div style={{ display: 'inline-flex', alignItems: 'center', padding: mobile ? '4px' : undefined }}>
                                <DragIndicatorIcon sx={{ color: 'text.disabled', fontSize: mobile ? '1.4rem' : '1.2rem' }} />
                            </div>}
                            {title && (
                                <div
                                    style={{
                                        flex: 1,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        fontWeight: 600,
                                        fontSize: mobile ? '0.95rem' : undefined,
                                    }}
                                >
                                    {title}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: mobile ? 8 : 4, flexShrink: 0 }}>
                            {headerActions}
                            {onClose && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClose();
                                    }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: mobile ? 24 : 18,
                                        lineHeight: 1,
                                        padding: mobile ? '4px 8px' : undefined,
                                        minWidth: mobile ? '44px' : undefined,
                                        minHeight: mobile ? '44px' : undefined,
                                    }}
                                    aria-label="Close"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div style={bodyMergedStyle}>{children}</div>

                {resizable && !mobile && !inline && (
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
                {resizable && mobile && !inline && (
                    <div
                        onMouseDown={onResizeStart('bottom') as any}
                        onTouchStart={onResizeStart('bottom') as any}
                        style={{
                            ...resizeHandleBase,
                            left: 0,
                            bottom: 0,
                            width: '100%',
                            height: '24px',
                            cursor: 'ns-resize',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <div style={{
                            width: '36px',
                            height: '4px',
                            borderRadius: '2px',
                            background: 'var(--text-faint)',
                            opacity: 0.5,
                        }} />
                    </div>
                )}
            </Paper>
        </div>
    );

    if (!portal) return panel;

    return createPortal(panel, portalContainer || document.body);
}

export default FloatingPanel;
