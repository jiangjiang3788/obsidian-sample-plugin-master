// src/features/dashboard/ui/BlockView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Item, readField, ThemeDefinition } from '@core/domain/schema';
import { makeObsUri } from '@core/utils/obsidian';
import { TaskCheckbox } from '@shared/components/TaskCheckbox';
import { getFieldLabel } from '@core/domain/fields';
import { useRef, useState, useEffect } from 'preact/hooks';
import { App } from 'obsidian';
import { useStore } from '@state/AppStore';
import { TagsRenderer } from '@shared/components/TagsRenderer';
import { getCategoryColor } from '@core/domain/categoryColorMap';
import { TaskSendToTimerButton } from '@shared/components/TaskSendToTimerButton';

// FieldRenderer 内部无变化
const FieldRenderer = ({ item, fieldKey, app, allThemes }: { item: Item; fieldKey: string; app: App; allThemes: ThemeDefinition[] }) => {
    // ... 此组件代码无任何变化
    const value = readField(item, fieldKey);
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        return null;
    }
    const label = getFieldLabel(fieldKey);
    
    if (fieldKey === 'tags') {
        return <TagsRenderer tags={value} allThemes={allThemes} />;
    }
    
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
                <img src={app.vault.adapter.getResourcePath(value)} alt={label} />
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

// TaskItem 内部更新了 makeObsUri 调用
const TaskItem = ({ item, fields, onMarkDone, app, allThemes }: { item: Item; fields: string[]; onMarkDone: (id: string) => void; app: App; allThemes: ThemeDefinition[] }) => {
    const done = isDone(item.categoryKey);
    return (
        <div class="bv-item bv-item--task">
            <div class="bv-task-checkbox-wrapper">
                <TaskCheckbox done={done} onMarkDone={() => onMarkDone(item.id)} />
            </div>
            <div class="bv-task-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* [修改] 调用 makeObsUri 时传入 app */}
                    <a href={makeObsUri(item, app)} target="_blank" rel="noopener" class={`bv-task-title ${done ? 'task-done' : ''}`}>
                        {item.icon && <span class="icon" style="margin-right: 4px;">{item.icon}</span>}
                        {item.title}
                    </a>
                    {!done && <TaskSendToTimerButton taskId={item.id} />}
                </div>
                <div class="bv-fields-list-wrapper">
                    {fields.map(fieldKey => <FieldRenderer key={fieldKey} item={item} fieldKey={fieldKey} app={app} allThemes={allThemes} />)}
                </div>
            </div>
        </div>
    );
};

// BlockItem 内部更新了 makeObsUri 调用
const BlockItem = ({ item, fields, isNarrow, app, allThemes }: { item: Item; fields: string[]; isNarrow: boolean; app: App; allThemes: ThemeDefinition[] }) => {
    const metadataFields = fields.filter(f => f !== 'title' && f !== 'content');
    const showTitle = fields.includes('title') && item.title;
    const showContent = fields.includes('content') && item.content;
    const narrowClass = isNarrow ? 'is-narrow' : '';

    return (
        <div class={`bv-item bv-item--block ${narrowClass}`}>
            <div class="bv-block-metadata">
                <div class="bv-fields-list-wrapper">
                       {metadataFields.map(fieldKey => <FieldRenderer key={fieldKey} item={item} fieldKey={fieldKey} app={app} allThemes={allThemes} />)}
                </div>
            </div>
            <div class="bv-block-main">
                {showTitle && (
                    <div class="bv-block-title">
                        {/* [修改] 调用 makeObsUri 时传入 app */}
                        <a href={makeObsUri(item, app)} target="_blank" rel="noopener">{item.title}</a>
                    </div>
                )}
                {showContent && (
                    <div class="bv-block-content">
                        {/* [修改] 调用 makeObsUri 时传入 app */}
                        <a href={makeObsUri(item, app)} target="_blank" rel="noopener">{item.content}</a>
                    </div>
                )}
            </div>
        </div>
    );
};

interface BlockViewProps {
    items: Item[];
    groupField?: string;
    fields?: string[];
    app: App;
    onMarkDone: (id: string) => void;
}

export function BlockView(props: BlockViewProps) {
    const { items, groupField, fields = [], app, onMarkDone } = props;
    const allThemes = useStore(state => state.settings.inputSettings.themes);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isNarrow, setIsNarrow] = useState(false);

    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) setIsNarrow(entry.contentRect.width < 450);
        });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);
    
    const renderItem = (item: Item) => {
        return item.type === 'task'
            ? <TaskItem key={item.id} item={item} fields={fields} onMarkDone={onMarkDone} app={app} allThemes={allThemes} />
            : <BlockItem key={item.id} item={item} fields={fields} isNarrow={isNarrow} app={app} allThemes={allThemes} />;
    };
    
    // ...分组逻辑无变化
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