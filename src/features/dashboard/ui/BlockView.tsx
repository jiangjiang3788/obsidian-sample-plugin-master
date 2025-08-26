// src/features/dashboard/ui/BlockView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Item, readField, ThemeDefinition } from '@core/domain/schema';
import { makeObsUri } from '@core/utils/obsidian';
import { TaskCheckbox } from '@shared/components/TaskCheckbox';
import { DataStore } from '@core/services/dataStore';
import { getFieldLabel } from '@core/domain/fields';
import { useRef, useState, useEffect } from 'preact/hooks';
import { App } from 'obsidian';
import { useStore } from '@state/AppStore';
import { TagsRenderer } from '@shared/components/TagsRenderer';
import { getCategoryColor } from '@core/domain/categoryColorMap';
import { TaskSendToTimerButton } from '@shared/components/TaskSendToTimerButton'; // 确认导入的是新按钮

// 内部辅助组件 1: FieldRenderer
const FieldRenderer = ({ item, fieldKey, app, allThemes }: { item: Item; fieldKey: string; app: App; allThemes: ThemeDefinition[] }) => {
    const value = readField(item, fieldKey);
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        return null;
    }
    const label = getFieldLabel(fieldKey);
    
    // 当字段为 tags 时，使用新的专用组件渲染
    if (fieldKey === 'tags') {
        return <TagsRenderer tags={value} allThemes={allThemes} />;
    }
    
    // 其他字段的渲染逻辑保持不变
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

// 内部辅助组件 2: TaskItem
const TaskItem = ({ item, fields, onMarkDone, app, allThemes }: { item: Item; fields: string[]; onMarkDone: (id: string) => void; app: App; allThemes: ThemeDefinition[] }) => {
    const done = isDone(item.categoryKey);
    return (
        <div class="bv-item bv-item--task">
            <div class="bv-task-checkbox-wrapper">
                <TaskCheckbox done={done} onMarkDone={() => onMarkDone(item.id)} />
            </div>
            <div class="bv-task-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <a href={makeObsUri(item)} target="_blank" rel="noopener" class={`bv-task-title ${done ? 'task-done' : ''}`}>
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

// 内部辅助组件 3: BlockItem
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


// 主组件: BlockView
interface BlockViewProps {
    items: Item[];
    groupField?: string;
    fields?: string[];
    app: App;
}

export function BlockView(props: BlockViewProps) {
    const { items, groupField, fields = [], app } = props;
    
    // 从 AppStore 中获取所有主题定义，以传递给子组件
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

    const onMarkItemDone = (itemId: string) => DataStore.instance.markItemDone(itemId);
    
    const renderItem = (item: Item) => {
        return item.type === 'task'
            ? <TaskItem key={item.id} item={item} fields={fields} onMarkDone={onMarkItemDone} app={app} allThemes={allThemes} />
            : <BlockItem key={item.id} item={item} fields={fields} isNarrow={isNarrow} app={app} allThemes={allThemes} />;
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