/** @jsxImportSource preact */

import type { ComponentChildren } from 'preact';

import { DragIndicatorIcon } from '@shared/ui/public';

import { toMouseEvent, toTouchEvent } from './floatingPanelEvents';

type FloatingPanelHeaderProps = {
    inline: boolean;
    title?: ComponentChildren;
    headerActions?: ComponentChildren;
    onClose?: () => void;
    onDragStart: (event: MouseEvent | TouchEvent) => void;
};

export function FloatingPanelHeader({ inline, title, headerActions, onClose, onDragStart }: FloatingPanelHeaderProps) {
    return (
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
                        onClick={(event) => {
                            event.stopPropagation();
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
    );
}
