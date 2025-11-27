/** @jsxImportSource preact */
// src/features/views/EventTimelineView.tsx
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import type { App } from 'obsidian';
import type { Item, ViewInstance } from '@/core/types/schema';
import { readField } from '@/core/types/schema';
import { dayjs } from '@core/utils/date';
import type { TimerService } from '@features/timer/TimerService';
import { groupItemsByFields, type GroupNode } from '@core/utils/itemGrouping';
import { TaskRow } from '@shared/ui/items/TaskRow';
import { BlockItem } from '@shared/ui/items/BlockItem';
import { GroupedContainer } from '@shared/ui/GroupedContainer';

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

    if (!groupedTree) {
        // 无分组：保持原有结构，使用 .event-timeline-view + .et-ungrouped
        return (
            <div class="event-timeline-view">
                <div class="et-ungrouped">
                    {renderEventList(filteredItems)}
                </div>
            </div>
        );
    }

    // 有分组时：使用通用 GroupedContainer 统一分组层级逻辑 + 折叠交互
    return (
        <GroupedContainer
            nodes={groupedTree}
            classNames={{
                root: 'event-timeline-view',
                group: 'et-group',
                title: 'et-group-title',
                content: 'et-group-content',
                toggleIcon: 'et-group-toggle-icon',
                label: 'et-group-label',
            }}
            renderLeaf={(leafItems) => renderEventList(leafItems)}
        />
    );
}
