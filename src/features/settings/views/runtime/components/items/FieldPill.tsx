/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item, ThemeDefinition } from '@core/types/public';
import { readField } from '@core/types/public';
import { getFieldDefinition, getFieldLabel, isImageFieldDefinition, normalizeImageValue } from '@core/fields/public';
import { getCategoryColor } from '@core/types/public';
import { TagsRenderer } from '@shared/ui/public';
import { getBaseCategory, getLeafPath } from '@core/utils/public';
import type { ResolveResourcePathHandler } from '@shared/types/public';

interface FieldPillProps {
    item: Item;
    fieldKey: string;
    resolveResourcePath?: ResolveResourcePathHandler;
    allThemes: ThemeDefinition[];
}

/**
 * 通用字段渲染组件 - 可在多个视图间复用
 */
export function FieldPill({ item, fieldKey, resolveResourcePath, allThemes }: FieldPillProps) {
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

    // Theme 字段特殊处理：默认展示 themePath，旧 theme 仍兼容。
    if ((fieldKey === 'themePath' || fieldKey === 'theme' || fieldKey === 'rootTheme' || fieldKey === 'leafTheme') && typeof value === 'string') {
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
    
    // 图片字段特殊处理：不再只认 pintu；任何 type/semantic 为 image 的字段都可渲染。
    const fieldDef = getFieldDefinition(fieldKey);
    if (isImageFieldDefinition(fieldDef)) {
        const image = normalizeImageValue(value);
        if (!image) return null;
        const src = image.kind === 'url' ? image.src : (resolveResourcePath?.(image.src) || image.src);
        return (
            <span class="tag-pill" title={`${label}: ${image.src}`}>
                <img src={src} alt={image.alt || label} />
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
