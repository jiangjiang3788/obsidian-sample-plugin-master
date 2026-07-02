/** @jsxImportSource preact */

import type { ResizeDirection } from './floatingPanelGeometry';
import { toMouseEvent, toTouchEvent } from './floatingPanelEvents';

type FloatingPanelResizeHandlesProps = {
    resizable: boolean;
    mobile: boolean;
    inline: boolean;
    onResizeStart: (direction: ResizeDirection) => (event: MouseEvent | TouchEvent) => void;
};

const desktopDirections: ResizeDirection[] = ['right', 'bottom', 'corner'];

export function FloatingPanelResizeHandles({ resizable, mobile, inline, onResizeStart }: FloatingPanelResizeHandlesProps) {
    if (!resizable || inline) return null;

    if (mobile) {
        return (
            <div
                onMouseDown={(event) => onResizeStart('bottom')(toMouseEvent(event))}
                onTouchStart={(event) => onResizeStart('bottom')(toTouchEvent(event))}
                className="think-floating-panel__resize think-floating-panel__resize--mobile"
            >
                <div className="think-floating-panel__resize-grip" />
            </div>
        );
    }

    return (
        <>
            {desktopDirections.map((direction) => (
                <div
                    key={direction}
                    onMouseDown={(event) => onResizeStart(direction)(toMouseEvent(event))}
                    onTouchStart={(event) => onResizeStart(direction)(toTouchEvent(event))}
                    className={`think-floating-panel__resize think-floating-panel__resize--${direction}`}
                />
            ))}
        </>
    );
}
