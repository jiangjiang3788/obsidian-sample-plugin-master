/** @jsxImportSource preact */
import { h } from 'preact';
import { App } from 'obsidian';
import type { Item, ThemeDefinition } from '@/core/types/schema';
import { readField } from '@/core/types/schema';
import { getFieldLabel } from '@/core/types/fields';
import { getCategoryColor } from '@/core/types/definitions';
import { TagsRenderer } from '@shared/ui/composites/TagsRenderer';
import { getBaseCategory } from '@core/utils/itemGrouping';

interface FieldPillProps {
    item: Item;
    fieldKey: string;
    app: App;
    allThemes: ThemeDefinition[];
}

/**
 * 通用字段渲染组件 - 可在多个视图间复用
 */
export function FieldPill({ item, fieldKey, app, allThemes }: FieldPillProps) {
    const value = readField(item, fieldKey);
    
    // 检查字段值是否为空
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        return null;
    }
    
    const label = getFieldLabel(fieldKey);
    
    // Tags 字段特殊处理
    if (fieldKey === 'tags') {
        return <TagsRenderer tags={value} allThemes={allThemes} />;
    }
    
    // Category 字段特殊处理
    if (fieldKey === 'categoryKey') {
        const baseCategory = getBaseCategory(item.categoryKey);
        return (
            <span class="tag-pill" title={`${label}: ${value}`} style={{ backgroundColor: getCategoryColor(item.categoryKey) }}>
                {baseCategory}
            </span>
        );
    }
    
    // 图片字段特殊处理
    if (fieldKey === 'pintu' && typeof value === 'string') {
        return (
            <span class="tag-pill" title={`${label}: ${value}`}>
                <img src={app.vault.adapter.getResourcePath(value)} alt={label} />
            </span>
        );
    }

    // 默认文本显示
    const displayValue = Array.isArray(value) ? value.join(', ') : String(value);

    return (
        <span class="tag-pill" title={`${label}: ${displayValue}`}>
            {displayValue}
        </span>
    );
}
