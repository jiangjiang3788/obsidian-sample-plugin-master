/**
 * FloatingPanel - 统一的可拖拽悬浮窗容器（Portal）
 *
 * V27 keeps this file as the public facade and orchestration shell. Geometry,
 * lifecycle side-effects, pointer interactions, header and resize handles live
 * in focused sibling modules to prevent the component from becoming a sink.
 */
/** @jsxImportSource preact */

import { useCallback, useMemo, useRef, useState } from 'preact/hooks';

import { detectThinkDeviceProfile, diagnosticLog, getThinkDeviceProfileAttributes, isThinkMobileLikeProfile } from '@shared/utils/public';
import { OverlayPortal, useOverlayLayer } from '@shared/ui/public';
import { useLocalStorage } from '@shared/hooks/public';

import { FloatingPanelHeader } from './FloatingPanelHeader';
import { FloatingPanelResizeHandles } from './FloatingPanelResizeHandles';
import type { FloatingPanelProps } from './FloatingPanel.types';
import {
    buildFloatingPanelBodyStyle,
    buildFloatingPanelPaperStyle,
    getMobileDefaultFloatingPosition,
    getNumericConstraint,
    type PanelSize,
} from './floatingPanelGeometry';
import { useFloatingPanelInteractions } from './useFloatingPanelInteractions';
import {
    useFloatingPanelCloseHandlers,
    useFloatingPanelPersistence,
    useFloatingPanelViewportClamp,
} from './useFloatingPanelLifecycle';

export type { FloatingPanelProps } from './FloatingPanel.types';

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
    portal = true,
    portalContainer,
    placement = 'floating',
}: FloatingPanelProps) {
    const deviceProfile = useMemo(() => detectThinkDeviceProfile(), []);
    const deviceProfileAttrs = useMemo(() => getThinkDeviceProfileAttributes(deviceProfile), [deviceProfile]);
    const mobile = isThinkMobileLikeProfile(deviceProfile);
    const inline = placement === 'inline';

    const overlay = useOverlayLayer(visible && !inline, `floating:${id}`);
    const effectiveZIndex = overlay.zIndex;

    const mobileDefaultPosition = useMemo(() => getMobileDefaultFloatingPosition(), []);
    const [storedPosition, setStoredPosition] = useLocalStorage(`think-floating-pos-${id}`, mobile ? mobileDefaultPosition : defaultPosition);
    const [position, setPosition] = useState(() => mobile ? mobileDefaultPosition : (storedPosition || defaultPosition));

    const initialSize = useMemo<PanelSize>(() => ({
        width: typeof width === 'number' ? width : undefined,
        height: typeof height === 'number' ? height : undefined,
    }), [width, height]);
    const [storedSize, setStoredSize] = useLocalStorage(`think-floating-size-${id}`, initialSize);
    const [size, setSize] = useState<PanelSize>(storedSize || initialSize);
    const rootRef = useRef<HTMLDivElement | null>(null);

    const minWidthPx = (mobile ? window.innerWidth - 16 : undefined) ?? getNumericConstraint(minWidth, 320) ?? 320;
    const minHeightPx = getNumericConstraint(minHeight, 160) ?? 160;
    const maxWidthPx = mobile ? window.innerWidth - 16 : (getNumericConstraint(maxWidth, window.innerWidth - 16) ?? window.innerWidth - 16);
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

    const clampSize = useCallback((next: PanelSize): PanelSize => ({
        ...next,
        width: typeof next.width === 'number' ? Math.min(Math.max(next.width, minWidthPx), maxWidthPx) : next.width,
        height: typeof next.height === 'number' ? Math.min(Math.max(next.height, minHeightPx), maxHeightPx) : next.height,
    }), [minWidthPx, maxWidthPx, minHeightPx, maxHeightPx]);

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

    useFloatingPanelViewportClamp({ size, position, clampSize, clampPosition, setSize, setPosition });
    useFloatingPanelCloseHandlers({ isTop: overlay.isTop, visible, onClose, closeOnOutsideClick, closeOnEscape, rootRef });
    useFloatingPanelPersistence({ position, size, resizable, setStoredPosition, setStoredSize });

    const { onDragStart, onResizeStart, onPanelPointerDown } = useFloatingPanelInteractions({
        inline,
        resizable,
        position,
        size,
        focus: overlay.focus,
        setPosition,
        setSize,
        clampPosition,
        clampSize,
        getEffectiveWidth,
        getEffectiveHeight,
    });

    if (!visible) return null;

    diagnosticLog('[FloatingPanel][portal-mode]', {
        id,
        portal,
        placement,
        portalTarget: portal ? (portalContainer ? 'custom' : 'think-overlay-host') : 'inline',
    });

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
            <div
                className={`think-os think-os--modal think-floating-panel${inline ? ' is-inline' : ''}${mobile ? ' is-mobile' : ''}`}
                {...deviceProfileAttrs}
                onMouseDown={onPanelPointerDown}
                onTouchStart={onPanelPointerDown}
                style={paperStyle}
            >
                {showHeader && (
                    <FloatingPanelHeader
                        inline={inline}
                        title={title}
                        headerActions={headerActions}
                        onClose={onClose}
                        onDragStart={onDragStart}
                    />
                )}

                <div className="think-floating-panel__body" style={bodyMergedStyle}>{children}</div>

                <FloatingPanelResizeHandles
                    resizable={resizable}
                    mobile={mobile}
                    inline={inline}
                    onResizeStart={onResizeStart}
                />
            </div>
        </div>
    );

    if (!portal) return panel;

    return <OverlayPortal container={portalContainer}>{panel}</OverlayPortal>;
}

export default FloatingPanel;
