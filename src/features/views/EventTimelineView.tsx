/** @jsxImportSource preact */
// src/features/views/EventTimelineView.tsx
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import type { App } from 'obsidian';
import type { Item, ViewInstance } from '@/core/types/schema';
import { readField } from '@/core/types/schema';
import { dayjs } from '@core/utils/date';
import type { TimerService } from '@features/timer/TimerService';
import { BlockView } from './BlockView';
import { groupItemsByFields, type GroupNode } from '@core/utils/itemGrouping';
import { FieldPill } from '@shared/ui/items/FieldPill';
import { ItemLink } from '@shared/ui/items/ItemLink';

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
 * - 按天分组，每天内部按时间升序排列
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

    const timeField = (module.viewConfig as any)?.timeField || 'date';
    const titleField = (module.viewConfig as any)?.titleField || 'title';
    const contentField = (module.viewConfig as any)?.contentField || 'content';
    const maxContentLength = (module.viewConfig as any)?.maxContentLength || 160;
    const displayFields = (module.viewConfig as any)?.fields || ['title', 'date'];
    const groupFields = (module.viewConfig as any)?.groupFields || [];

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

    const dayGroups = useMemo(() => {
        const groups = new Map<string, { date: ReturnType<typeof dayjs>; items: Item[] }>();

        for (const item of items) {
            const t = getItemTime(item);
            if (!t) continue;
            if (!t.isBetween(start, end, 'minute', '[]')) continue;

            const key = t.format('YYYY-MM-DD');
            if (!groups.has(key)) {
                groups.set(key, { date: t.startOf('day'), items: [] });
            }
            groups.get(key)!.items.push(item);
        }

        const result = Array.from(groups.values())
            .map(group => ({
                ...group,
                items: group.items.sort((a, b) => {
                    const ta = getItemTime(a)!;
                    const tb = getItemTime(b)!;
                    return ta.valueOf() - tb.valueOf();
                })
            }))
            .sort((a, b) => a.date.valueOf() - b.date.valueOf());

        return result;
    }, [items, start, end, timeField]);

    if (dayGroups.length === 0) {
        return <div class="event-timeline-empty">当前时间范围内没有事件记录。</div>;
    }

    return (
        <div class="event-timeline-view">
            {dayGroups.map(group => (
                <div class="et-day-group" key={group.date.format('YYYY-MM-DD')}>
                    <div class="et-day-header">
                        <span class="et-day-date">{group.date.format('YYYY-MM-DD')}</span>
                        <span class="et-day-weekday">{group.date.format('ddd')}</span>
                        <span class="et-day-meta">共 {group.items.length} 条事件</span>
                    </div>
                    <div class="et-day-body">
                        <div class="et-line" />
                        <div class="et-events">
                            {group.items.map(item => {
                                const t = getItemTime(item)!;
                                const timeLabel = t.format('HH:mm');
                                const title = (readField(item, titleField) as string) || '(无标题)';
                                const content = (readField(item, contentField) as string) || '';

                                return (
                                    <div class="et-event">
                                        <div class="et-dot" />
                                        <div class="et-event-content">
                                            <div class="et-event-time">{timeLabel}</div>
                                            
                                            {/* 显示配置的字段 */}
                                            <div class="et-event-fields">
                                                {displayFields.map((fieldKey: string) => {
                                                    if (fieldKey === timeField) return null; // 时间字段已单独显示
                                                    
                                                    if (fieldKey === 'title') {
                                                        return (
                                                            <div key="title" class="et-event-title">
                                                                <ItemLink item={item} app={app} />
                                                            </div>
                                                        );
                                                    }
                                                    
                                                    if (fieldKey === 'content' || fieldKey === contentField) {
                                                        const contentValue = (readField(item, contentField) as string) || '';
                                                        return contentValue ? (
                                                            <div key="content" class="et-event-summary">
                                                                {contentValue.length > maxContentLength ? `${contentValue.slice(0, maxContentLength)}…` : contentValue}
                                                            </div>
                                                        ) : null;
                                                    }
                                                    
                                                    // 其他字段使用 FieldPill 显示
                                                    return (
                                                        <div key={fieldKey} class="et-event-field">
                                                            <FieldPill 
                                                                item={item} 
                                                                fieldKey={fieldKey} 
                                                                app={app} 
                                                                allThemes={allThemes} 
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
