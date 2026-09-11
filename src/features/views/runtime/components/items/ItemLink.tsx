/** @jsxImportSource preact */
import { h } from 'preact';
import type { RecordViewItem } from '@core/types/public';
import { getRecordPrimaryText } from '@core/fields/public';
import { createRecordGestureHandlers, RECORD_GESTURE_HINT } from '@shared/ui/public';
import type { OpenRecordHandler, OpenRecordOriginHandler } from '@shared/types/public';

interface ItemLinkProps {
    item: RecordViewItem;
    className?: string;
    showIcon?: boolean;
    /**
     * Explicit renderer text. Omit it on generic identity surfaces to use the
     * global primaryText contract. Pass item.title when the user explicitly
     * selected the real title field, so an empty title never gets silently
     * replaced by a type-aware value.
     */
    displayText?: string;
    onOpenRecord?: OpenRecordHandler;
    onOpenRecordOrigin?: OpenRecordOriginHandler;
}

/** 通用 Record identity link. Layout belongs to the view; identity text belongs to Record presentation. */
export function ItemLink({ item, className = '', showIcon = true, displayText, onOpenRecord, onOpenRecordOrigin }: ItemLinkProps) {
    const gesture = createRecordGestureHandlers({
        item,
        onOpenOrigin: onOpenRecordOrigin,
        onPrimary: () => {
            void onOpenRecord?.(item);
        },
    });
    const visibleText = displayText === undefined ? getRecordPrimaryText(item) : displayText;

    return (
        <span
            class={`item-link ${className}`}
            role="button"
            tabIndex={0}
            onClick={gesture.onClick as any}
            onDblClick={gesture.onDblClick as any}
            onTouchEnd={gesture.onTouchEnd as any}
            onKeyDown={gesture.onKeyDown as any}
            title={RECORD_GESTURE_HINT}
            style={{ cursor: 'pointer' }}
        >
            {showIcon && item.icon && <span class="icon mr-1">{item.icon}</span>}
            {visibleText}
        </span>
    );
}
