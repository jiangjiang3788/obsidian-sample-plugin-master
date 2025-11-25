// src/features/dashboard/ui/BlockView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useRef, useState, useEffect } from 'preact/hooks';
import { App } from 'obsidian';
import { Item, ThemeDefinition } from '@/core/types/schema';
import { groupItemsByField, getSortedGroupKeys } from '@core/utils/itemGrouping';
import { TaskRow } from '@shared/ui/items/TaskRow';
import { FieldPill } from '@shared/ui/items/FieldPill';
import { ItemLink } from '@shared/ui/items/ItemLink';
import type { TimerService } from '@features/timer/TimerService';

// 简化的 Block 项目组件
const BlockItem = ({ item, fields, isNarrow, app, allThemes }: { 
    item: Item; 
    fields: string[]; 
    isNarrow: boolean; 
    app: App; 
    allThemes: ThemeDefinition[] 
}) => {
    const metadataFields = fields.filter(f => f !== 'title' && f !== 'content');
    const showTitle = fields.includes('title') && item.title;
    const showContent = fields.includes('content') && item.content;
    const narrowClass = isNarrow ? 'is-narrow' : '';

    return (
        <div class={`bv-item bv-item--block ${narrowClass}`}>
            <div class="bv-block-metadata">
                <div class="bv-fields-list-wrapper">
                    {metadataFields.map(fieldKey => (
                        <FieldPill 
                            key={fieldKey} 
                            item={item} 
                            fieldKey={fieldKey} 
                            app={app} 
                            allThemes={allThemes} 
                        />
                    ))}
                </div>
            </div>
            <div class="bv-block-main">
                {showTitle && (
                    <div class="bv-block-title">
                        <ItemLink item={item} app={app} />
                    </div>
                )}
                {showContent && (
                    <div class="bv-block-content">
                        <ItemLink item={item} app={app} className="content-link" />
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
    timerService: TimerService;
    timers: any[];
    allThemes: ThemeDefinition[];
}

export function BlockView(props: BlockViewProps) {
    const { items, groupField, fields = [], app, onMarkDone, timerService, timers, allThemes } = props;
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
        if (item.type === 'task') {
            const timer = timers.find(t => t.taskId === item.id);
            return (
                <TaskRow 
                    key={item.id} 
                    item={item} 
                    onMarkDone={onMarkDone} 
                    app={app} 
                    timerService={timerService} 
                    timer={timer}
                    allThemes={allThemes}
                    showFields={[]} // TaskRow 中任务类型不显示其他字段
                />
            );
        } else {
            return (
                <BlockItem 
                    key={item.id} 
                    item={item} 
                    fields={fields} 
                    isNarrow={isNarrow} 
                    app={app} 
                    allThemes={allThemes} 
                />
            );
        }
    };
    
    // 无分组时的渲染逻辑保持不变
    if (!groupField) {
        return (
            <div class="bv-container" ref={containerRef}>
                {items.map(renderItem)}
            </div>
        );
    }

    // 使用 core 工具函数进行分组
    const grouped = groupItemsByField(items, groupField);
    const groupKeys = getSortedGroupKeys(grouped);

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
                            title="点击折叠/展开"
                        >
                            <span class="bv-group-toggle-icon">
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
