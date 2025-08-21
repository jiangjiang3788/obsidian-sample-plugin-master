// src/features/dashboard/ui/components/FieldRenderer.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Item, readField } from '@core/domain/schema';
import { getFieldLabel } from '@core/domain/fields';
import { App } from 'obsidian';
import { getCategoryColor } from '@core/domain/categoryColorMap';

interface FieldRendererProps {
    item: Item;
    fieldKey: string;
    app: App; // [NEW] 传入 app 用于解析图片路径
}

export function FieldRenderer({ item, fieldKey, app }: FieldRendererProps) {
    const value = readField(item, fieldKey);
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        return null;
    }

    const label = getFieldLabel(fieldKey);
    
    // [NEW] 特殊处理 categoryKey，为其添加背景色
    if (fieldKey === 'categoryKey') {
        const baseCategory = (item.categoryKey || '').split('/')[0] || '';
        return (
            <span class="tag-pill" style={`background:${getCategoryColor(item.categoryKey)};`}>
                {baseCategory}
            </span>
        );
    }
    
    // [NEW] 特殊处理 pintu，将其渲染为图片
    if (fieldKey === 'pintu' && typeof value === 'string') {
        return (
            <span class="tag-pill" title={`${label}: ${value}`}>
                 <img 
                    src={app.vault.adapter.getResourcePath(value)} 
                    alt={label} 
                    style={{ height: '1.2em', verticalAlign: 'middle' }} // 样式使其像 emoji 一样
                />
            </span>
        );
    }

    const displayValue = Array.isArray(value) ? value.join(', ') : String(value);

    return (
        <span class="tag-pill" title={`${label}: ${displayValue}`}>
            {displayValue}
        </span>
    );
}