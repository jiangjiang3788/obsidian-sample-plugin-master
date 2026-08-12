/** @jsxImportSource preact */
import { h } from 'preact';
import type { RecordViewItem } from '@core/types/public';
import { createRecordGestureHandlers } from '@shared/ui/public';
import type { OpenRecordHandler, OpenRecordOriginHandler } from '@shared/types/public';

interface ItemLinkProps {
    item: RecordViewItem;
    className?: string;
    showIcon?: boolean;
    onOpenRecord?: OpenRecordHandler;
    onOpenRecordOrigin?: OpenRecordOriginHandler;
}

/**
 * 通用项目链接组件 - 可在多个视图间复用
 */
export function ItemLink({ item, className = '', showIcon = true, onOpenRecord, onOpenRecordOrigin }: ItemLinkProps) {
    const gesture = createRecordGestureHandlers({
        item,
        onOpenOrigin: onOpenRecordOrigin,
        onPrimary: () => {
            void onOpenRecord?.(item);
        },
    });

    return (
        <span
            class={`item-link ${className}`}
            onClick={gesture.onClick as any}
            onDblClick={gesture.onDblClick as any}
            onTouchEnd={gesture.onTouchEnd as any}
            style={{ cursor: 'pointer' }}
        >
            {showIcon && item.icon && <span class="icon mr-1">{item.icon}</span>}
            {item.title}
        </span>
    );
}
