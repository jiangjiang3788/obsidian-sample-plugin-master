/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item, ThemeDefinition } from '@core/public';
import { readField } from '@core/public';
import { getFieldLabel } from '@core/public';
import { getCategoryColor } from '@core/public';
import { TagsRenderer } from '@shared/ui/composites/TagsRenderer';
import { getBaseCategory, getLeafPath } from '@core/public';

interface FieldPillProps {
    item: Item;
    fieldKey: string;
    app: any;
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

    // Theme 字段特殊处理（术语对齐：theme=主题，独立于 tags）
    if (fieldKey === 'theme' && typeof value === 'string') {
        const fullPath = value;
        const labelText = getLeafPath(fullPath) || fullPath;
        return (
            <span class="tag-pill" title={`${label}: ${fullPath}`} style={{ backgroundColor: getCategoryColor(fullPath) }}>
                {labelText}
            </span>
        );
    }
    
    // Category 字段特殊处理
    if (fieldKey === 'categoryKey') {
        const baseCategory = getLeafPath(item.categoryKey) || getBaseCategory(item.categoryKey);
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
