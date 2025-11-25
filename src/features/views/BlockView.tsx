// src/features/dashboard/ui/BlockView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useRef, useState, useEffect } from 'preact/hooks';
import { App } from 'obsidian';
import { Item, ThemeDefinition } from '@/core/types/schema';
import { groupItemsByField, getSortedGroupKeys, groupItemsByFields, type GroupNode } from '@core/utils/itemGrouping';
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

    // 路径生成工具：[{field, key}, ...] -> "field=key|field2=key2"
    const makeGroupPath = (chain: { field: string; key: string }[]): GroupPath =>
        chain.map(n => `${n.field}=${n.key}`).join('|');

    // 单个分组折叠/展开
    const toggleSingleGroup = (path: GroupPath) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [path]: !prev[path]
        }));
    };

    // --- 调试日志 ---
    console.log('[BlockView] 接收到的 Props:', props);
    console.log(`[BlockView] 生效的分组字段 (effectiveGroupFields):`, effectiveGroupFields);

    // 使用多字段分组工具构建分组树
    const groupTree: GroupNode[] = groupItemsByFields(items, effectiveGroupFields);

    console.log('[BlockView] 生成的分组树 (groupTree):', JSON.parse(JSON.stringify(groupTree))); // 使用 JSON 深拷贝打印，避免控制台显示Proxy对象

    // 收集所有分组路径，供 Ctrl+点击 时一键折叠/展开使用
    const allGroupPaths: GroupPath[] = [];
    const collectPaths = (nodes: GroupNode[], parentChain: { field: string; key: string }[] = []) => {
        for (const node of nodes) {
            const chain = [...parentChain, { field: node.field, key: node.key }];
            const path = makeGroupPath(chain);
            allGroupPaths.push(path);
            if (node.children && node.children.length > 0) {
                collectPaths(node.children, chain);
            }
        }
    };
    collectPaths(groupTree);

    // 设置全部分组的折叠状态（true=折叠，false=展开）
    const setAllGroupsCollapsed = (collapsed: boolean) => {
        setCollapsedGroups(prev => {
            const next: Record<GroupPath, boolean> = { ...prev };
            for (const path of allGroupPaths) {
                next[path] = collapsed;
            }
            return next;
        });
    };

    // 处理分组标题点击：普通点击 = 切换当前；Ctrl+点击 = 全部折叠/展开
    const onGroupTitleClick = (path: GroupPath, evt: MouseEvent) => {
        if (evt.ctrlKey) {
            // 判断是否当前还有“展开的”，有的话 Ctrl 点击则全部折叠，否则全部展开
            const anyExpanded = allGroupPaths.some(p => !collapsedGroups[p]);
            setAllGroupsCollapsed(anyExpanded);
        } else {
            toggleSingleGroup(path);
        }
    };

    // 递归渲染多级分组
    const renderGroupNodes = (
        nodes: GroupNode[],
        parentChain: { field: string; key: string }[] = [],
        level = 0,
    ) => {
        return nodes.map(node => {
            const chain = [...parentChain, { field: node.field, key: node.key }];
            const path = makeGroupPath(chain);
            const isCollapsed = collapsedGroups[path];
            const hasChildren = !!node.children && node.children.length > 0;
            const isLeaf = !!node.items;

            // 叶子节点 item 数
            const itemCount = isLeaf ? node.items!.length : 0;

            return (
                <div key={path} class={`bv-group bv-group--level-${level}`}>
                    <h5
                        class="bv-group-title"
                        onClick={e => onGroupTitleClick(path, e as any)}
                        title="点击折叠/展开（Ctrl+点击：全部折叠/展开）"
                    >
                        <span class="bv-group-toggle-icon">
                            {isCollapsed ? '▶' : '▼'}
                        </span>
                        {/* 这里只显示值本身，保持和之前类似的视觉；如需展示字段名可以加上 `${node.field}: ` */}
                        <span class="bv-group-label">
                            {itemCount ? `${node.key} (${itemCount})` : node.key}
                        </span>
                    </h5>

                    {!isCollapsed && (
                        <div class="bv-group-content">
                            {hasChildren && renderGroupNodes(node.children!, chain, level + 1)}
                            {isLeaf && node.items!.map(renderItem)}
                        </div>
                    )}
                </div>
            );
        });
    };

    return (
        <div class="bv-container" ref={containerRef}>
            {renderGroupNodes(groupTree)}
        </div>
    );
}
