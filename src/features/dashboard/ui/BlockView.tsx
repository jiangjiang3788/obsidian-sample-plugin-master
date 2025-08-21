// src/features/dashboard/ui/BlockView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Item, readField } from '@core/domain/schema';
import { getCategoryColor } from '@core/domain/categoryColorMap';
import { makeObsUri } from '@core/utils/obsidian';
import { TaskCheckbox } from '@shared/components/TaskCheckbox';
import { DataStore } from '@core/services/dataStore';
import { getFieldLabel } from '@core/domain/fields';
import { useRef, useState, useEffect } from 'preact/hooks';
import { App } from 'obsidian';

// --- 内部辅助组件 1: FieldRenderer ---
const FieldRenderer = ({ item, fieldKey, app }: { item: Item; fieldKey: string; app: App }) => {
    const value = readField(item, fieldKey);
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        return null;
    }
    const label = getFieldLabel(fieldKey);
    
    if (fieldKey === 'categoryKey') {
        const baseCategory = (item.categoryKey || '').split('/')[0] || '';
        return (
            <span class="tag-pill" title={`${label}: ${value}`} style={`background:${getCategoryColor(item.categoryKey)};`}>
                {baseCategory}
            </span>
        );
    }
    
    if (fieldKey === 'pintu' && typeof value === 'string') {
        return (
            <span class="tag-pill" title={`${label}: ${value}`}>
                <img 
                    src={app.vault.adapter.getResourcePath(value)} 
                    alt={label} 
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
};

const isDone = (k?: string) => /\/(done|cancelled)$/i.test(k || '');

// --- 内部辅助组件 2: TaskItem ---
const TaskItem = ({ item, fields, onMarkDone, app }: { item: Item; fields: string[]; onMarkDone: (id: string) => void; app: App; }) => {
    const done = isDone(item.categoryKey);
    return (
        <div class="bv-item bv-item--task">
            <div class="bv-task-checkbox-wrapper">
                <TaskCheckbox done={done} onMarkDone={() => onMarkDone(item.id)} />
            </div>
            <div class="bv-task-content">
                <a href={makeObsUri(item)} target="_blank" rel="noopener" class={`bv-task-title ${done ? 'task-done' : ''}`}>
                    {item.icon && <span class="icon" style="margin-right: 4px;">{item.icon}</span>}
                    {item.title}
                </a>
                <div class="bv-fields-list">
                    {fields.map(fieldKey => <FieldRenderer key={fieldKey} item={item} fieldKey={fieldKey} app={app} />)}
                </div>
            </div>
        </div>
    );
};

// --- 内部辅助组件 3: BlockItem ---
const BlockItem = ({ item, fields, isNarrow, app }: { item: Item; fields: string[]; isNarrow: boolean; app: App; }) => {
    const metadataFields = fields.filter(f => f !== 'title' && f !== 'content');
    const showTitle = fields.includes('title') && item.title;
    const showContent = fields.includes('content') && item.content;
    const narrowClass = isNarrow ? 'is-narrow' : '';

    return (
        <div class={`bv-item bv-item--block ${narrowClass}`}>
            <div class="bv-block-metadata">
                <div class="bv-fields-list">
                    {metadataFields.map(fieldKey => <FieldRenderer key={fieldKey} item={item} fieldKey={fieldKey} app={app} />)}
                </div>
            </div>
            <div class="bv-block-main">
                {showTitle && (
                    <div class="bv-block-title">
                        <a href={makeObsUri(item)} target="_blank" rel="noopener">{item.title}</a>
                    </div>
                )}
                {showContent && (
                     <div class="bv-block-content">
                        <a href={makeObsUri(item)} target="_blank" rel="noopener">{item.content}</a>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- 主组件: BlockView ---
interface BlockViewProps {
    items: Item[];
    groupField?: string;
    fields?: string[];
    app: App;
}

export function BlockView(props: BlockViewProps) {
    const { items, groupField, fields = [], app } = props;
    
    const containerRef = useRef<HTMLDivElement>(null);
    const [isNarrow, setIsNarrow] = useState(false);

    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) setIsNarrow(entry.contentRect.width < 450);
        });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const onMarkItemDone = (itemId: string) => DataStore.instance.markItemDone(itemId);
    
    const renderItem = (item: Item) => {
        return item.type === 'task'
            ? <TaskItem key={item.id} item={item} fields={fields} onMarkDone={onMarkItemDone} app={app} />
            : <BlockItem key={item.id} item={item} fields={fields} isNarrow={isNarrow} app={app} />;
    };
    
    if (!groupField) {
        return (
            <div class="bv-container" ref={containerRef}>
                {items.map(renderItem)}
            </div>
        );
    }

    const grouped: Record<string, Item[]> = {};
    for (const it of items) {
        const key = String(readField(it, groupField) ?? '(未分类)');
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(it);
    }
    const groupKeys = Object.keys(grouped).sort((a,b) => a.localeCompare(b, 'zh-CN'));

    return (
        <div class="bv-container" ref={containerRef}>
            {groupKeys.map(key => (
                <div key={key} class="bv-group">
                    <h5 class="bv-group-title">{key}</h5>
                    <div class="bv-group-content">
                        {grouped[key].map(renderItem)}
                    </div>
                </div>
            ))}
        </div>
    );
}