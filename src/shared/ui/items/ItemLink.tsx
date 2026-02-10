/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item } from '@core/public';
import { makeObsUri } from '@core/public';

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
    return (
        <a 
            href={makeObsUri(item, app.vault.getName())} 
            target="_blank" 
            rel="noopener" 
            class={`item-link ${className}`}
        >
            {showIcon && item.icon && <span class="icon mr-1">{item.icon}</span>}
            {item.title}
        </a>
    );
}
