/**
 * FloatingPanel - 可拖拽的浮窗容器组件（Portal）
 * 支持 mouse/touch 拖拽、localStorage 持久化位置、边界约束
 */
/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import { Paper } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useLocalStorage } from '@/shared/hooks';
import { createPortal } from 'preact/compat';

const getEventCoords = (e: MouseEvent | TouchEvent) => {
    if (e instanceof MouseEvent) return { x: e.clientX, y: e.clientY };
    if ((e as TouchEvent).touches && (e as TouchEvent).touches.length > 0) {
        const t = (e as TouchEvent).touches[0];
        return { x: t.clientX, y: t.clientY };
    }
    return null;
};

export interface FloatingPanelProps {
    id?: string; // 用于 localStorage 键
    defaultPosition?: { x: number; y: number };
    minWidth?: number | string;
    zIndex?: number;
    children: any;
    onClose?: () => void;
}

export function FloatingPanel({ id, defaultPosition = { x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 150 }, minWidth = 320, zIndex = 9999, children, onClose }: FloatingPanelProps) {
    const storageKey = id ? `think-floating-pos-${id}` : undefined;
    const [stored, setStored] = useLocalStorage(storageKey || '', defaultPosition);
    const [position, setPosition] = useState<{ x: number; y: number }>(stored || defaultPosition);
    const dragRef = useRef({ startX: 0, startY: 0, panelX: 0, panelY: 0 });
    const rootRef = useRef<HTMLDivElement | null>(null);

    // clamp
    const clampPosition = useCallback((pos: { x: number; y: number }) => {
        const maxX = Math.max(0, window.innerWidth - (typeof minWidth === 'number' ? minWidth : 320));
        const maxY = Math.max(0, window.innerHeight - 80);
        return {
            x: Math.min(Math.max(0, pos.x), maxX),
            y: Math.min(Math.max(0, pos.y), maxY)
        };
    }, [minWidth]);

    useEffect(() => {
        const clamped = clampPosition(position);
        if (clamped.x !== position.x || clamped.y !== position.y) {
            setPosition(clamped);
        }
    }, []);

    // 点击外部关闭：延迟绑定监听器以避免打开时捕获触发器的点击
    useEffect(() => {
        const ignoreFirstClick = { current: true } as { current: boolean };
        const handleDocMouseDown = (e: MouseEvent) => {
            if (ignoreFirstClick.current) return; // 忽略打开时的首个点击
            if (!rootRef.current) return;
            if (e.target instanceof Node && !rootRef.current.contains(e.target)) {
                onClose?.();
            }
        };
        // 先在下一次事件循环绑定 listener，并在短延迟后允许处理点击
        const bindTimer = window.setTimeout(() => document.addEventListener('mousedown', handleDocMouseDown), 0);
        const clearIgnoreTimer = window.setTimeout(() => { ignoreFirstClick.current = false; }, 50);
        return () => {
            clearTimeout(bindTimer);
            clearTimeout(clearIgnoreTimer);
            document.removeEventListener('mousedown', handleDocMouseDown);
        };
    }, [onClose]);

    useEffect(() => {
        if (storageKey) setStored(position);
    }, [position]);

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
        dragRef.current = { startX: coords.x, startY: coords.y, panelX: position.x, panelY: position.y };
        window.addEventListener('mousemove', onDragMove as any);
        window.addEventListener('mouseup', onDragEnd as any);
        window.addEventListener('touchmove', onDragMove as any, { passive: false } as any);
        window.addEventListener('touchend', onDragEnd as any);
    }, [position, onDragMove, onDragEnd]);

    const panel = (
        <div ref={rootRef}>
            <Paper elevation={4} style={{ position: 'fixed', left: position.x + 'px', top: position.y + 'px', zIndex, minWidth, userSelect: 'none' }}>
                {/* 将拖拽句柄扩展到整个 header 区域，方便左键按住拖动 */}
                <div onMouseDown={onDragStart as any} onTouchStart={onDragStart as any} style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid var(--background-modifier-border)', cursor: 'move' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', marginRight: 8 }}>
                        <DragIndicatorIcon sx={{ color: 'text.disabled', fontSize: '1.2rem' }} />
                    </div>
                    <div style={{ flex: 1 }} />
                    {onClose && <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>×</button>}
                </div>
                <div style={{ padding: 8 }}>
                    {children}
                </div>
            </Paper>
        </div>
    );

    return createPortal(panel, document.body);
}

export default FloatingPanel;
