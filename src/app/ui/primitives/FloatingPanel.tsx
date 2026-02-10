/**
 * FloatingPanel - 统一的可拖拽悬浮窗容器（Portal）
 *
 * ✅ 统一能力：
 * - mouse/touch 拖拽
 * - localStorage 位置持久化（按 id）
 * - 点击外部关闭（可选）
 * - ESC 关闭（可选，且默认只关闭“当前聚焦”的浮窗）
 * - 通过 Zustand 共享 zIndex / activeId（悬浮窗之间共享状态）
 */
/** @jsxImportSource preact */

import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import { Paper } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { createPortal } from 'preact/compat';

import { useLocalStorage } from '@/shared/hooks';
import { makeSelectFloatingWindowZIndex, selectFloatingWindowsActiveId, selectFloatingWindowsFocus, selectFloatingWindowsRegister, selectFloatingWindowsUnregister, useSelector } from '@/app/public';

const getEventCoords = (e: MouseEvent | TouchEvent) => {
    if (e instanceof MouseEvent) return { x: e.clientX, y: e.clientY };
    if ((e as TouchEvent).touches && (e as TouchEvent).touches.length > 0) {
        const t = (e as TouchEvent).touches[0];
        return { x: t.clientX, y: t.clientY };
    }
    return null;
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

    /** 头部 */
    title?: ComponentChildren;
    headerActions?: ComponentChildren;
    showHeader?: boolean;

    /** 内容 */
    children: ComponentChildren;
    bodyPadding?: number | string;

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
    title,
    headerActions,
    showHeader = true,
    children,
    bodyPadding = 8,
    visible = true,
    onClose,
    closeOnOutsideClick = true,
    closeOnEscape = true,
    zIndex = 9999,
}: FloatingPanelProps) {
    // ============== 共享状态：zIndex / activeId（Zustand） ==============
    const register = useSelector(selectFloatingWindowsRegister);
    const unregister = useSelector(selectFloatingWindowsUnregister);
    const focus = useSelector(selectFloatingWindowsFocus);
    const activeId = useSelector(selectFloatingWindowsActiveId);
    const managedZIndex = useSelector(makeSelectFloatingWindowZIndex(id));
    const effectiveZIndex = managedZIndex ?? zIndex;

    // ============== 位置持久化（localStorage） ==============
    const storageKey = `think-floating-pos-${id}`;
    const [stored, setStored] = useLocalStorage(storageKey, defaultPosition);
    const [position, setPosition] = useState<{ x: number; y: number }>(stored || defaultPosition);
    const dragRef = useRef({ startX: 0, startY: 0, panelX: 0, panelY: 0 });
    const rootRef = useRef<HTMLDivElement | null>(null);

    // clamp
    const getClampWidth = useCallback(() => {
        if (typeof width === 'number') return width;
        if (typeof minWidth === 'number') return minWidth;
        return 320;
    }, [width, minWidth]);

    const clampPosition = useCallback((pos: { x: number; y: number }) => {
        const maxX = Math.max(0, window.innerWidth - getClampWidth());
        const maxY = Math.max(0, window.innerHeight - 80);
        return {
            x: Math.min(Math.max(0, pos.x), maxX),
            y: Math.min(Math.max(0, pos.y), maxY)
        };
    }, [getClampWidth]);

    // 生命周期：注册 / 注销（供 zIndex 管理）
    // - visible=false 时不应占用 activeId/zIndex（例如：计时器“隐藏”）
    useEffect(() => {
        if (!visible) {
            unregister(id);
            return;
        }

        register(id);
        return () => unregister(id);
    }, [id, visible, register, unregister]);

    // 挂载 + resize 时 clamp 一次
    useEffect(() => {
        const clamped = clampPosition(position);
        if (clamped.x !== position.x || clamped.y !== position.y) setPosition(clamped);

        const onResize = () => setPosition((p) => clampPosition(p));
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 点击外部关闭：延迟绑定监听器以避免“打开时的同一次点击”误触发关闭
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

    // ESC 关闭：默认只关闭“当前聚焦”的浮窗（利用 shared state）
    useEffect(() => {
        if (!onClose || !closeOnEscape || !visible) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            // 只有 active 的窗口响应 ESC（避免一次 ESC 关掉所有窗口）
            if (activeId && activeId !== id) return;
            onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onClose, closeOnEscape, visible, activeId, id]);

    useEffect(() => {
        setStored(position);
    }, [position, setStored]);

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

    const onPanelPointerDown = useCallback(() => {
        focus(id);
    }, [id, focus]);

    if (!visible) return null;

    const panel = (
        <div ref={rootRef}>
            <Paper
                elevation={4}
                onMouseDown={onPanelPointerDown as any}
                onTouchStart={onPanelPointerDown as any}
                style={{
                    position: 'fixed',
                    left: position.x + 'px',
                    top: position.y + 'px',
                    zIndex: effectiveZIndex,
                    minWidth,
                    maxWidth,
                    minHeight,
                    maxHeight,
                    width,
                    height,
                    userSelect: 'none',
                }}
            >
                {showHeader && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '6px 8px',
                            borderBottom: '1px solid var(--background-modifier-border)',
                            gap: 8,
                        }}
                    >
                        {/* 仅左侧区域作为拖拽句柄，避免按钮点按触发拖拽 */}
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

                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
                <div style={{ padding: bodyPadding }}>{children}</div>
            </Paper>
        </div>
    );

    return createPortal(panel, document.body);
}

export default FloatingPanel;
