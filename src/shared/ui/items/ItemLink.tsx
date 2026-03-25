/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item } from '@core/public';
import { createRecordGestureHandlers } from '@/shared/ui/utils/recordOrigin';
import { openEditFromItem } from '@/app/actions/recordUiActions';

interface ItemLinkProps {
    item: Item;
    app: any;
    className?: string;
    showIcon?: boolean;
}

/**
 * 通用项目链接组件 - 可在多个视图间复用
 */
export function ItemLink({ item, app, className = '', showIcon = true }: ItemLinkProps) {
    const gesture = createRecordGestureHandlers({
        item,
        app,
        onPrimary: () => {
            openEditFromItem({ app, item });
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
