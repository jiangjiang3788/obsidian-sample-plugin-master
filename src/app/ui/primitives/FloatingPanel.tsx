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

import { DragIndicatorIcon, Paper } from '@shared/ui/public';
import { detectThinkDeviceProfile, getThinkDeviceProfileAttributes, isThinkMobileLikeProfile, diagnosticLog } from '@shared/utils/public';
import { useLocalStorage } from '@shared/hooks/public';
import { createPortal } from 'preact/compat';

import {
    makeSelectFloatingWindowZIndex,
    selectFloatingWindowsActiveId,
    selectFloatingWindowsFocus,
    selectFloatingWindowsRegister,
    selectFloatingWindowsUnregister,
    useSelector,
} from '@/app/public';
import {
    buildFloatingPanelBodyStyle,
    buildFloatingPanelPaperStyle,
    getEventCoords,
    getMobileDefaultFloatingPosition,
    getNumericConstraint,
    passiveListenerOptions,
    type PanelSize,
    type ResizeDirection,
} from './floatingPanelGeometry';

type FloatingDomHandler = (event: MouseEvent | TouchEvent) => void;
const toDomListener = (handler: FloatingDomHandler): EventListener => handler as unknown as EventListener;
const toMouseEvent = (event: unknown): MouseEvent => event as MouseEvent;
const toTouchEvent = (event: unknown): TouchEvent => event as TouchEvent;

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
    const deviceProfile = useMemo(() => detectThinkDeviceProfile(), []);
    const deviceProfileAttrs = useMemo(() => getThinkDeviceProfileAttributes(deviceProfile), [deviceProfile]);
    const mobile = isThinkMobileLikeProfile(deviceProfile);
    const inline = placement === 'inline';

    const register = useSelector(selectFloatingWindowsRegister);
    const unregister = useSelector(selectFloatingWindowsUnregister);
    const focus = useSelector(selectFloatingWindowsFocus);
    const activeId = useSelector(selectFloatingWindowsActiveId);
    const managedZIndex = useSelector(makeSelectFloatingWindowZIndex(id));
    const effectiveZIndex = managedZIndex ?? zIndex;

    const mobileDefaultPosition = useMemo(() => getMobileDefaultFloatingPosition(), []);

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
        if (!(e as TouchEvent).touches) e.preventDefault();
        const coords = getEventCoords(e);
        if (!coords) return;
        const dx = coords.x - dragRef.current.startX;
        const dy = coords.y - dragRef.current.startY;
        setPosition(clampPosition({ x: dragRef.current.panelX + dx, y: dragRef.current.panelY + dy }));
    }, [clampPosition]);

    const onDragEnd = useCallback(() => {
        window.removeEventListener('mousemove', toDomListener(onDragMove));
        window.removeEventListener('mouseup', toDomListener(onDragEnd));
        window.removeEventListener('touchmove', toDomListener(onDragMove));
        window.removeEventListener('touchend', toDomListener(onDragEnd));
    }, [onDragMove]);

    const onDragStart = useCallback((e: MouseEvent | TouchEvent) => {
        if (inline) return;
        const coords = getEventCoords(e);
        if (!coords) return;
        focus(id);
        dragRef.current = { startX: coords.x, startY: coords.y, panelX: position.x, panelY: position.y };
        window.addEventListener('mousemove', toDomListener(onDragMove));
        window.addEventListener('mouseup', toDomListener(onDragEnd));
        window.addEventListener('touchmove', toDomListener(onDragMove), passiveListenerOptions);
        window.addEventListener('touchend', toDomListener(onDragEnd), passiveListenerOptions);
    }, [inline, id, focus, position, onDragMove, onDragEnd]);

    const onResizeMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!(e as TouchEvent).touches) e.preventDefault();
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
        window.removeEventListener('mousemove', toDomListener(onResizeMove));
        window.removeEventListener('mouseup', toDomListener(onResizeEnd));
        window.removeEventListener('touchmove', toDomListener(onResizeMove));
        window.removeEventListener('touchend', toDomListener(onResizeEnd));
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
        window.addEventListener('mousemove', toDomListener(onResizeMove));
        window.addEventListener('mouseup', toDomListener(onResizeEnd));
        window.addEventListener('touchmove', toDomListener(onResizeMove), passiveListenerOptions);
        window.addEventListener('touchend', toDomListener(onResizeEnd), passiveListenerOptions);
    }, [resizable, focus, id, onResizeMove, onResizeEnd, getEffectiveWidth, getEffectiveHeight]);

    const onPanelPointerDown = useCallback(() => {
        focus(id);
    }, [id, focus]);

    if (!visible) return null;

    diagnosticLog('[FloatingPanel][portal-mode]', { id, portal, placement, portalTarget: portal ? (portalContainer ? 'custom' : 'document.body') : 'inline' });

    const paperStyle = buildFloatingPanelPaperStyle({
        inline,
        mobile,
        position,
        effectiveZIndex,
        minWidth,
        maxWidth,
        minHeight,
        maxHeight,
        width,
        height,
        size,
    });
    const bodyMergedStyle = buildFloatingPanelBodyStyle(mobile, bodyPadding, bodyStyle);

    const panel = (
        <div ref={rootRef}>
            <Paper
                elevation={4}
                className={`think-os think-os--modal think-floating-panel${inline ? ' is-inline' : ''}${mobile ? ' is-mobile' : ''}`}
                {...deviceProfileAttrs}
                onMouseDown={onPanelPointerDown}
                onTouchStart={onPanelPointerDown}
                style={paperStyle}
            >
                {showHeader && (
                    <div className="think-floating-panel__header">
                        <div
                            onMouseDown={(event) => onDragStart(toMouseEvent(event))}
                            onTouchStart={(event) => onDragStart(toTouchEvent(event))}
                            className="think-floating-panel__drag-region"
                        >
                            {!inline && <div className="think-floating-panel__drag-icon">
                                <DragIndicatorIcon fontSize="inherit" />
                            </div>}
                            {title && (
                                <div className="think-floating-panel__title">
                                    {title}
                                </div>
                            )}
                        </div>

                        <div className="think-floating-panel__actions">
                            {headerActions}
                            {onClose && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClose();
                                    }}
                                    className="think-floating-panel__close"
                                    aria-label="Close"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="think-floating-panel__body" style={bodyMergedStyle}>{children}</div>

                {resizable && !mobile && !inline && (
                    <>
                        <div
                            onMouseDown={(event) => onResizeStart('right')(toMouseEvent(event))}
                            onTouchStart={(event) => onResizeStart('right')(toTouchEvent(event))}
                            className="think-floating-panel__resize think-floating-panel__resize--right"
                        />
                        <div
                            onMouseDown={(event) => onResizeStart('bottom')(toMouseEvent(event))}
                            onTouchStart={(event) => onResizeStart('bottom')(toTouchEvent(event))}
                            className="think-floating-panel__resize think-floating-panel__resize--bottom"
                        />
                        <div
                            onMouseDown={(event) => onResizeStart('corner')(toMouseEvent(event))}
                            onTouchStart={(event) => onResizeStart('corner')(toTouchEvent(event))}
                            className="think-floating-panel__resize think-floating-panel__resize--corner"
                        />
                    </>
                )}
                {resizable && mobile && !inline && (
                    <div
                        onMouseDown={(event) => onResizeStart('bottom')(toMouseEvent(event))}
                        onTouchStart={(event) => onResizeStart('bottom')(toTouchEvent(event))}
                        className="think-floating-panel__resize think-floating-panel__resize--mobile"
                    >
                        <div className="think-floating-panel__resize-grip" />
                    </div>
                )}
            </Paper>
        </div>
    );

    if (!portal) return panel;

    return createPortal(panel, portalContainer || document.body);
}

export default FloatingPanel;
