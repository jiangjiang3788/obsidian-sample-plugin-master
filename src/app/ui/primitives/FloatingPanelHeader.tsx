/** @jsxImportSource preact */

import type { ComponentChildren } from 'preact';

import { CloseIcon, DragIndicatorIcon, ThinkIconButton } from '@shared/ui/public';

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
                {!inline && <span className="think-floating-panel__drag-icon" aria-hidden="true">
                    <DragIndicatorIcon fontSize="inherit" />
                </span>}
                {title && <div className="think-floating-panel__title">{title}</div>}
            </div>

            <div className="think-floating-panel__actions">
                {headerActions}
                {onClose && (
                    <ThinkIconButton
                        label="关闭"
                        size="sm"
                        className="think-floating-panel__close"
                        icon={<CloseIcon fontSize="small" />}
                        onClick={(event) => {
                            event.stopPropagation();
                            onClose();
                        }}
                    />
                )}
            </div>
        </div>
    );
}
