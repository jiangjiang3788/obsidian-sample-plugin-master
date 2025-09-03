// src/features/dashboard/ui/BlockView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Item, readField, ThemeDefinition } from '@core/domain/schema';
import { makeObsUri } from '@core/utils/obsidian';
import { TaskCheckbox } from '@shared/components/TaskCheckbox';
// [移除] 不再需要直接依赖 DataStore
// import { DataStore } from '@core/services/dataStore';
import { getFieldLabel } from '@core/domain/fields';
import { useRef, useState, useEffect } from 'preact/hooks';
import { App } from 'obsidian';
import { useStore } from '@state/AppStore';
import { TagsRenderer } from '@shared/components/TagsRenderer';
import { getCategoryColor } from '@core/domain/categoryColorMap';
import { TaskSendToTimerButton } from '@shared/components/TaskSendToTimerButton';

// 内部辅助组件 1: FieldRenderer (无变化)
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

// [修改] TaskItem 现在接收 onMarkDone 作为 prop
// 内部辅助组件 2: TaskItem
const TaskItem = ({ item, fields, onMarkDone, app, allThemes }: { item: Item; fields: string[]; onMarkDone: (id: string) => void; app: App; allThemes: ThemeDefinition[] }) => {
    const done = isDone(item.categoryKey);
    return (
        <div class="bv-item bv-item--task">
            <div class="bv-task-checkbox-wrapper">
                {/* [修改] TaskCheckbox 现在调用从 prop 传入的 onMarkDone 函数 */}
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

// 内部辅助组件 3: BlockItem (无变化)
const BlockItem = ({ item, fields, isNarrow, app, allThemes }: { item: Item; fields: string[]; isNarrow: boolean; app: App; allThemes: ThemeDefinition[] }) => {
    // ... 此组件代码无任何变化
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
// [修改] BlockViewProps 接口增加了 onMarkDone
interface BlockViewProps {
    items: Item[];
    groupField?: string;
    fields?: string[];
    app: App;
    onMarkDone: (id: string) => void; // 新增 prop
}

export function BlockView(props: BlockViewProps) {
    // [修改] 从 props 中解构出 onMarkDone
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

    // [移除] 不再需要在组件内部定义 onMarkItemDone
    // const onMarkItemDone = (itemId: string) => DataStore.instance.markItemDone(itemId);
    
    const renderItem = (item: Item) => {
        return item.type === 'task'
            // [修改] 将 onMarkDone prop 传递给 TaskItem
            ? <TaskItem key={item.id} item={item} fields={fields} onMarkDone={onMarkDone} app={app} allThemes={allThemes} />
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