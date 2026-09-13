/** @jsxImportSource preact */
import { h } from 'preact';
import type { JSX } from 'preact';
import type { RecordViewItem } from '@core/types/public';
import { readField } from '@core/types/public';
import { formatFieldValue, getFieldDefinition, getFieldLabel, isImageFieldDefinition, normalizeImageValue } from '@core/fields/public';
import { resolveGoalColor } from '@core/goal/public';
import { normalizeRecordTypePresentationKey } from '@core/recordTypes/public';
import { TagsRenderer } from '@shared/ui/public';
import { getLeafPath } from '@core/utils/public';
import type { OpenRecordOriginHandler, ResolveResourcePathHandler } from '@shared/types/public';
import { hasPlatformModifier, isKeyboardActivation, stopInteractionEvent } from '@shared/ui/public';

interface FieldPillProps {
    item: RecordViewItem;
    fieldKey: string;
    resolveResourcePath?: ResolveResourcePathHandler;
    onOpenRecordOrigin?: OpenRecordOriginHandler;
}

/**
 * 通用字段渲染组件 - 可在多个视图间复用
 */
export function FieldPill({ item, fieldKey, resolveResourcePath, onOpenRecordOrigin }: FieldPillProps) {
    const value = readField(item, fieldKey);
    
    // 检查字段值是否为空
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        return null;
    }
    
    const label = getFieldLabel(fieldKey);
    const originProps: JSX.HTMLAttributes<HTMLSpanElement> = onOpenRecordOrigin ? {
        role: 'button' as const,
        tabIndex: 0,
        onClick: (event) => {
            if (!hasPlatformModifier(event)) return;
            stopInteractionEvent(event);
            void onOpenRecordOrigin(item);
        },
        onKeyDown: (event) => {
            if (!hasPlatformModifier(event) || !isKeyboardActivation(event)) return;
            stopInteractionEvent(event);
            void onOpenRecordOrigin(item);
        },
    } : {};
    const originTitle = 'Ctrl/⌘+点击打开原文';
    
    // Tags 字段特殊处理
    if (fieldKey === 'tags') {
        return <span {...originProps} title={originTitle}><TagsRenderer tags={value} /></span>;
    }

    // Goal 层级直接由 goalPath/rootGoal/leafGoal 读取。
    if ((fieldKey === 'goalPath' || fieldKey === 'rootGoal' || fieldKey === 'leafGoal') && typeof value === 'string') {
        const fullPath = value;
        const labelText = getLeafPath(fullPath) || fullPath;
        return (
            <span {...originProps} class="tag-pill" title={`${label}: ${fullPath} · ${originTitle}`} style={{ backgroundColor: resolveGoalColor(undefined, fullPath) }}>
                {labelText}
            </span>
        );
    }

    // Record Type uses the one global semantic color contract.
    if (fieldKey === 'recordType') {
        const recordType = normalizeRecordTypePresentationKey(value);
        const displayValue = formatFieldValue(fieldKey, value, item);
        return (
            <span {...originProps} class="tag-pill think-record-type-pill" data-record-type={recordType} title={`${label}: ${displayValue} · ${originTitle}`}>
                {displayValue}
            </span>
        );
    }

    
    // 图片字段按 image type/semantic 统一渲染。
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
    const displayValue = formatFieldValue(fieldKey, value, item);

    return (
        <span {...originProps} class="tag-pill" title={`${label}: ${displayValue} · ${originTitle}`}>
            {displayValue}
        </span>
    );
}
