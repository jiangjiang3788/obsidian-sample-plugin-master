// src/features/dashboard/ui/BlockView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useRef, useState, useEffect } from 'preact/hooks';
import { App } from 'obsidian';
import { Item, ThemeDefinition } from '@/core/types/schema';
import { groupItemsByField, getSortedGroupKeys, groupItemsByFields, type GroupNode } from '@core/utils/itemGrouping';
import { TaskRow } from '@shared/ui/items/TaskRow';
import { BlockItem } from '@shared/ui/items/BlockItem';
import type { TimerService } from '@features/timer/TimerService';
import { exportItemsToMarkdown } from '@/core/utils/exportUtils';
import { Notice } from 'obsidian';
import { GroupedContainer } from '@shared/ui/GroupedContainer';


type GroupPath = string;

interface BlockViewProps {
    items: Item[];
    groupField?: string;          // 兼容旧配置：单字段分组
    groupFields?: string[];       // 新配置：多字段层级分组（A -> B -> C）
    fields?: string[];
    app: App;
    onMarkDone: (id: string) => void;
    timerService: TimerService;
    timers: any[];
    allThemes: ThemeDefinition[];
}

export function BlockView(props: BlockViewProps) {
    const { items, groupField, groupFields, fields = [], app, onMarkDone, timerService, timers, allThemes } = props;
    const containerRef = useRef<HTMLDivElement>(null);
    const [isNarrow, setIsNarrow] = useState(false);

    // 记录每个分组路径的折叠状态：path => collapsed
    // 现在折叠逻辑由 GroupedContainer 内部管理，这里保留 state 仅为兼容可能的外部依赖（如未来扩展）
    const [collapsedGroups, setCollapsedGroups] = useState<Record<GroupPath, boolean>>({});

    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) setIsNarrow(entry.contentRect.width < 450);
        });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

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

    // 统一处理单字段 / 多字段：优先使用 groupFields，其次兼容 groupField
    const effectiveGroupFields: string[] = (() => {
        if (groupFields && groupFields.length > 0) return groupFields;
        if (groupField) return [groupField];
        return [];
    })();



    // 无分组时的渲染逻辑保持不变
    if (!effectiveGroupFields.length) {
        return (
            <div class="bv-container" ref={containerRef}>

                {items.map(renderItem)}
            </div>
        );
    }

    // ===== 多字段层级分组逻辑 =====

    // --- 调试日志 ---
    console.log('[BlockView] 接收到的 Props:', props);
    console.log(`[BlockView] 生效的分组字段 (effectiveGroupFields):`, effectiveGroupFields);

    // 使用多字段分组工具构建分组树
    const groupTree: GroupNode[] = groupItemsByFields(items, effectiveGroupFields);

    console.log('[BlockView] 生成的分组树 (groupTree):', JSON.parse(JSON.stringify(groupTree))); // 使用 JSON 深拷贝打印，避免控制台显示Proxy对象

    // 之前这里有一整套手写的折叠 & 递归渲染逻辑，现已由 GroupedContainer 统一处理

    return (
        <div class="bv-container" ref={containerRef}>
            <GroupedContainer
                nodes={groupTree}
                classNames={{
                    root: '',
                    group: 'bv-group bv-group--level-0', // level 细分由缩进控制，这里保留原有 bv-group class
                    title: 'bv-group-title',
                    content: 'bv-group-content',
                    toggleIcon: 'bv-group-toggle-icon',
                    label: 'bv-group-label',
                }}
                renderLeaf={(leafItems) => leafItems.map(renderItem)}
            />
        </div>
    );
}
