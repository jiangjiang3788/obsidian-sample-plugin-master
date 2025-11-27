/** @jsxImportSource preact */
// src/features/views/EventTimelineView.tsx
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type { App } from 'obsidian';
import type { Item, ViewInstance } from '@/core/types/schema';
import { readField } from '@/core/types/schema';
import { dayjs } from '@core/utils/date';
import type { TimerService } from '@features/timer/TimerService';
import { BlockView } from './BlockView';
import { groupItemsByFields, type GroupNode } from '@core/utils/itemGrouping';
import { TaskRow } from '@shared/ui/items/TaskRow';
import { BlockItem } from '@shared/ui/items/BlockItem';

interface EventTimelineViewProps {
    items: Item[];
    app: App;
    dateRange: [Date, Date];
    module: ViewInstance;
    currentView: '年' | '季' | '月' | '周' | '天';
    actionService?: any;
    timerService: TimerService;
    timers: any[];
    allThemes: any[];
}

/**
 * 事件时间线视图：
 * - 纵向线性展示「这段时间发生了哪些事件」
 * - 按配置的字段进行多级分组（如有），组内按时间升序排列
 * - 日期/时间仍然在左侧作为时间线主轴
 */
export function EventTimelineView(props: EventTimelineViewProps) {
    const {
        items,
        app,
        dateRange,
        module,
        currentView, // 目前主要影响 dateRange，展示形式保持竖向事件流
        actionService,
        timerService,
        timers,
        allThemes
    } = props;

    // 使用统一配置：优先使用模块级配置
    const displayFields = module.fields || ['title', 'date'];
    const groupFields: string[] = module.groupFields || [];
    
    // 视图特有配置，fallback 到默认值
    const viewConfig = (module.viewConfig as any) || {};
    const timeField = viewConfig.timeField || 'date';
    const titleField = viewConfig.titleField || 'title';
    const contentField = viewConfig.contentField || 'content';
    const maxContentLength = viewConfig.maxContentLength ?? 160;

    // 分组折叠状态管理
    type GroupPath = string;
    const [collapsedGroups, setCollapsedGroups] = useState<Record<GroupPath, boolean>>({});

    const start = useMemo(() => dayjs(dateRange[0]), [dateRange]);
    const end = useMemo(() => dayjs(dateRange[1]), [dateRange]);

    function getItemTime(item: Item) {
        const raw = readField(item, timeField);
        if (!raw) return null;
        try {
            return dayjs(raw);
        } catch {
            return null;
        }
    }

    // 先按时间过滤 + 排序，确保时间线语义正确
    const filteredItems = useMemo(() => {
        const result: Item[] = [];

        for (const item of items) {
            const t = getItemTime(item);
            if (!t) continue;
            if (!t.isBetween(start, end, 'minute', '[]')) continue;
            result.push(item);
        }

        return result.sort((a, b) => {
            const ta = getItemTime(a)!;
            const tb = getItemTime(b)!;
            return ta.valueOf() - tb.valueOf();
        });
    }, [items, start, end, timeField]);

    // 如果配置了分组字段，则按字段进行多级分组；否则仅按时间线顺序展示
    const groupedTree: GroupNode[] | null = useMemo(() => {
        if (!groupFields || groupFields.length === 0) return null;
        return groupItemsByFields(filteredItems, groupFields);
    }, [filteredItems, groupFields]);

    if (filteredItems.length === 0) {
        return <div class="event-timeline-empty">当前时间范围内没有事件记录。</div>;
    }

    // 分组折叠/展开逻辑
    const makeGroupPath = (chain: { field: string; key: string }[]): GroupPath =>
        chain.map(n => `${n.field}=${n.key}`).join('|');

    const toggleSingleGroup = (path: GroupPath) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [path]: !prev[path]
        }));
    };

    // 收集所有分组路径
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
    if (groupedTree) collectPaths(groupedTree);

    const setAllGroupsCollapsed = (collapsed: boolean) => {
        setCollapsedGroups(prev => {
            const next: Record<GroupPath, boolean> = { ...prev };
            for (const path of allGroupPaths) {
                next[path] = collapsed;
            }
            return next;
        });
    };

    const onGroupTitleClick = (path: GroupPath, evt: MouseEvent) => {
        if (evt.ctrlKey) {
            const anyExpanded = allGroupPaths.some(p => !collapsedGroups[p]);
            setAllGroupsCollapsed(anyExpanded);
        } else {
            toggleSingleGroup(path);
        }
    };

    // 渲染事件列表，处理日期去重
    const renderEventList = (items: Item[]) => {
        let lastDate = '';
        
        return items.map((item, index) => {
            const t = getItemTime(item);
            const dateLabel = t ? t.format('YYYY-MM-DD') : '';
            const timeLabel = t ? t.format('HH:mm') : '';
            
            // 日期去重：相同日期只在第一个显示
            const showDate = dateLabel !== lastDate;
            if (showDate) lastDate = dateLabel;
            
            const titleForKey =
                (readField(item, titleField) as string) ||
                (readField(item, 'title') as string) ||
                '';

            return (
                <div class="et-event" key={`${dateLabel}-${timeLabel}-${titleForKey}-${index}`}>
                    {/* 左侧：日期和时间 */}
                    <div class="et-event-date">
                        {showDate && t && (
                            <div class="et-date-label">
                                {dateLabel}
                            </div>
                        )}
                        {/* task类型显示时间，block类型不显示时间 */}
                        {item.type === 'task' && (
                            <div class="et-time-label">{timeLabel}</div>
                        )}
                    </div>

                    {/* 中间：时间线 */}
                    <div class="et-line">
                        <div class="et-dot" />
                    </div>

                    {/* 右侧：内容卡片 */}
                    <div class="et-event-card">
                        {item.type === 'task' ? (
                            <TaskRow
                                item={item}
                                onMarkDone={(id: string) => actionService?.markTaskDone?.(id)}
                                app={app}
                                timerService={timerService}
                                timer={timers.find(t => t.taskId === item.id)}
                                allThemes={allThemes}
                                showFields={[]} // TaskRow 不显示额外字段
                            />
                        ) : (
                            <BlockItem
                                item={item}
                                fields={displayFields}
                                isNarrow={false}
                                app={app}
                                allThemes={allThemes}
                            />
                        )}
                    </div>
                </div>
            );
        });
    };

    // 统计某个分组下的总事件数
    const countItemsInGroup = (node: GroupNode): number => {
        const n: any = node as any;
        if (n.items) return n.items.length;
        if (!n.children) return 0;
        return (n.children as GroupNode[]).reduce(
            (sum: number, child: GroupNode) => sum + countItemsInGroup(child),
            0
        );
    };

    // 递归渲染分组树 - 支持多级缩进和折叠
    const renderGroupNodes = (nodes: GroupNode[], level: number, parentChain: { field: string; key: string }[] = []) => {
        return nodes.map(node => {
            const items = node.items || [];
            const children = node.children || [];
            const chain = [...parentChain, { field: node.field, key: node.key }];
            const path = makeGroupPath(chain);
            const isCollapsed = collapsedGroups[path];
            
            // 标题缩进：基础 12px + 层级 * 24px
            const indentStyle = { paddingLeft: `${12 + level * 24}px` };

            return (
                <div class="et-group" key={path}>
                    <h5
                        class="et-group-title"
                        style={indentStyle}
                        onClick={e => onGroupTitleClick(path, e as any)}
                        title="点击折叠/展开（Ctrl+点击：全部折叠/展开）"
                    >
                        <span class="et-group-toggle-icon">
                            {isCollapsed ? '▶' : '▼'}
                        </span>
                        <span class="et-group-label">
                            {node.key} ({items.length || countItemsInGroup(node)})
                        </span>
                    </h5>
                    {!isCollapsed && (
                        <div class="et-group-content">
                            {items.length > 0 
                                ? renderEventList(items)
                                : renderGroupNodes(children, level + 1, chain)
                            }
                        </div>
                    )}
                </div>
            );
        });
    };

    return (
        <div class="event-timeline-view">
            {groupedTree
                ? renderGroupNodes(groupedTree, 0)
                : (
                    <div class="et-ungrouped">
                        {renderEventList(filteredItems)}
                    </div>
                )
            }
        </div>
    );
}
