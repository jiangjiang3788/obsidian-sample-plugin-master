/** @jsxImportSource preact */
import { h } from 'preact';
import { App } from 'obsidian';
import type { Item } from '@/core/types/schema';
import { makeObsUri } from '@core/utils/obsidian';

interface ItemLinkProps {
    item: Item;
    app: App;
    className?: string;
    showIcon?: boolean;
}

/**
 * 通用项目链接组件 - 可在多个视图间复用
 */
export function ItemLink({ item, app, className = '', showIcon = true }: ItemLinkProps) {
    return (
        <a 
            href={makeObsUri(item, app)} 
            target="_blank" 
            rel="noopener" 
            class={`item-link ${className}`}
        >
            {showIcon && item.icon && <span class="icon mr-1">{item.icon}</span>}
            {item.title}
        </a>
    );
}
