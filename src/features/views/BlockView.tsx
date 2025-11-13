// src/features/dashboard/ui/BlockView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
// [1. 导入 useState]
import { useRef, useState, useEffect } from 'preact/hooks';
import { App } from 'obsidian';
// [修复] 将导入路径统一到 @lib/domain，并加入 getCategoryColor
import { Item, readField, ThemeDefinition } from '@core/types/domain/schema';
import { getCategoryColor } from '@core/types/domain/definitions';
import { makeObsUri } from '@core/utils/obsidian';
import { getFieldLabel } from '@core/types/domain/fields';
import { useStore } from '@core/stores/AppStore';
import { TagsRenderer } from '@shared/ui/composites/TagsRenderer';
import { TaskCheckbox } from '@shared/ui/composites/TaskCheckbox';
import { TaskSendToTimerButton } from '@shared/ui/composites/TaskSendToTimerButton';

// FieldRenderer 组件保持不变
const FieldRenderer = ({ item, fieldKey, app, allThemes }: { item: Item; fieldKey: string; app: App; allThemes: ThemeDefinition[] }) => {
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

// TaskItem 组件保持不变
const isDone = (k?: string) => /\/(done|cancelled)$/i.test(k || '');
const TaskItem = ({ item, fields, onMarkDone, app, allThemes }: { item: Item; fields: string[]; onMarkDone: (id: string) => void; app: App; allThemes: ThemeDefinition[] }) => {
    const done = isDone(item.categoryKey);
    return (
        <div class="bv-item bv-item--task">
            <div class="bv-task-checkbox-wrapper">
                <TaskCheckbox done={done} onMarkDone={() => onMarkDone(item.id)} />
            </div>
            <div class="bv-task-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

// BlockItem 组件保持不变
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
                        <a href={makeObsUri(item, app)} target="_blank" rel="noopener">{item.title}</a>
                    </div>
                )}
                {showContent && (
                    <div class="bv-block-content">
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

    // [2. 添加用于存储折叠状态的 state，默认为空对象（全部展开）]
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) setIsNarrow(entry.contentRect.width < 450);
        });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // [3. 添加切换分组折叠状态的处理函数]
    const toggleGroup = (key: string) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [key]: !prev[key] // 切换指定 key 的布尔值
        }));
    };
    
    const renderItem = (item: Item) => {
        return item.type === 'task'
            ? <TaskItem key={item.id} item={item} fields={fields} onMarkDone={onMarkDone} app={app} allThemes={allThemes} />
            : <BlockItem key={item.id} item={item} fields={fields} isNarrow={isNarrow} app={app} allThemes={allThemes} />;
    };
    
    // 无分组时的渲染逻辑保持不变
    if (!groupField) {
        return (
            <div class="bv-container" ref={containerRef}>
                {items.map(renderItem)}
            </div>
        );
    }

    // 分组逻辑保持不变
    const grouped: Record<string, Item[]> = {};
    for (const it of items) {
        const key = String(readField(it, groupField) ?? '(未分类)');
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(it);
    }
    const groupKeys = Object.keys(grouped).sort((a,b) => a.localeCompare(b, 'zh-CN'));

    return (
        <div class="bv-container" ref={containerRef}>
            {groupKeys.map(key => {
                // 获取当前分组的折叠状态
                const isCollapsed = collapsedGroups[key];
                return (
                    <div key={key} class="bv-group">
                        {/* [4. 修改分组标题，使其可点击并显示折叠/展开图标] */}
                        <h5 
                            class="bv-group-title" 
                            onClick={() => toggleGroup(key)} 
                            style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '0.25em' }}
                            title="点击折叠/展开"
                        >
                            <span style={{ display: 'inline-block', width: '1.2em', textAlign: 'center' }}>
                                {isCollapsed ? '▶' : '▼'}
                            </span>
                            {`${key} (${grouped[key].length})`}
                        </h5>
                        
                        {/* [5. 根据折叠状态条件渲染分组内容] */}
                        {!isCollapsed && (
                            <div class="bv-group-content">
                                {grouped[key].map(renderItem)}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    );
}
