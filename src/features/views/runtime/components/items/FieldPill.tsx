/** @jsxImportSource preact */
import { h } from 'preact';
import type { RecordViewItem, ThemeDefinition } from '@core/types/public';
import { readField } from '@core/types/public';
import { getFieldDefinition, getFieldLabel, isImageFieldDefinition, normalizeImageValue } from '@core/fields/public';
import { getCategoryColor } from '@core/types/public';
import { TagsRenderer } from '@shared/ui/public';
import { getBaseCategory, getLeafPath } from '@core/utils/public';
import type { OpenRecordOriginHandler, ResolveResourcePathHandler } from '@shared/types/public';
import { hasPlatformModifier, isKeyboardActivation, stopInteractionEvent } from '@shared/ui/public';

interface FieldPillProps {
    item: RecordViewItem;
    fieldKey: string;
    resolveResourcePath?: ResolveResourcePathHandler;
    allThemes: ThemeDefinition[];
    onOpenRecordOrigin?: OpenRecordOriginHandler;
}

/**
 * 通用字段渲染组件 - 可在多个视图间复用
 */
export function FieldPill({ item, fieldKey, resolveResourcePath, allThemes, onOpenRecordOrigin }: FieldPillProps) {
    const value = readField(item, fieldKey);
    
    // 检查字段值是否为空
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        return null;
    }
    
    const label = getFieldLabel(fieldKey);
    const originProps = onOpenRecordOrigin ? {
        role: 'button',
        tabIndex: 0,
        onClick: (event: MouseEvent) => {
            if (!hasPlatformModifier(event)) return;
            stopInteractionEvent(event);
            void onOpenRecordOrigin(item);
        },
        onKeyDown: (event: KeyboardEvent) => {
            if (!hasPlatformModifier(event) || !isKeyboardActivation(event)) return;
            stopInteractionEvent(event);
            void onOpenRecordOrigin(item);
        },
    } : {};
    const originTitle = 'Ctrl/⌘+点击打开原文';
    
    // Tags 字段特殊处理
    if (fieldKey === 'tags') {
        return <span {...originProps} title={originTitle}><TagsRenderer tags={value} allThemes={allThemes} /></span>;
    }

    // Theme 字段特殊处理：默认展示 themePath，旧 theme 仍兼容。
    if ((fieldKey === 'themePath' || fieldKey === 'theme' || fieldKey === 'rootTheme' || fieldKey === 'leafTheme') && typeof value === 'string') {
        const fullPath = value;
        const labelText = getLeafPath(fullPath) || fullPath;
        return (
            <span {...originProps} class="tag-pill" title={`${label}: ${fullPath} · ${originTitle}`} style={{ backgroundColor: getCategoryColor(fullPath) }}>
                {labelText}
            </span>
        );
    }
    
    // Category 字段特殊处理
    if (fieldKey === 'categoryKey') {
        const baseCategory = getLeafPath(item.categoryKey) || getBaseCategory(item.categoryKey);
        return (
            <span {...originProps} class="tag-pill" title={`${label}: ${value} · ${originTitle}`} style={{ backgroundColor: getCategoryColor(item.categoryKey) }}>
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
            <span {...originProps} class="tag-pill" title={`${label}: ${image.src} · ${originTitle}`}>
                <img src={src} alt={image.alt || label} />
            </span>
        );
    }

    // 默认文本显示
    const displayValue = Array.isArray(value) ? value.join(', ') : String(value);

    return (
        <span {...originProps} class="tag-pill" title={`${label}: ${displayValue} · ${originTitle}`}>
            {displayValue}
        </span>
    );
}
