/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item, ThemeDefinition } from '@core/public';
import { TaskCheckbox } from '../composites/TaskCheckbox';
import { TaskSendToTimerButton } from '../composites/TaskSendToTimerButton';
import { isDone } from '@core/public';
import { FieldPill } from './FieldPill';
import type { OpenRecordHandler, OpenRecordOriginHandler, ResolveResourcePathHandler, TimerController } from '../../types/actions';
import { createRecordGestureHandlers } from '../utils/recordOrigin';

interface TaskRowProps {
    item: Item;
    onMarkDone: (id: string) => void;
    resolveResourcePath?: ResolveResourcePathHandler;
    onOpenRecordOrigin?: OpenRecordOriginHandler;
    timerService: TimerController;
    onOpenRecord?: OpenRecordHandler;
    timer?: any;
    allThemes: ThemeDefinition[];
    showFields?: string[];
    compact?: boolean;
    /** 可选展示标题。用于 EventTimelineView 等视图按配置字段展示任务正文，而不改变 item.title 真值。 */
    displayTitle?: string;
}


export function TaskRow({ 
    item, 
    onMarkDone, 
    resolveResourcePath,
    onOpenRecordOrigin,
    timerService, 
    timer, 
    allThemes,
    showFields = [],
    compact = false,
    displayTitle,
    onOpenRecord
}: TaskRowProps) {
    const done = isDone(item.categoryKey);
    const visibleTitle = String(displayTitle ?? item.content ?? item.title ?? '').trim() || item.title;

    const openEdit = (evt?: Event) => {
        evt?.preventDefault?.();
        evt?.stopPropagation?.();
        void onOpenRecord?.(item);
    };

    const gesture = createRecordGestureHandlers({ item, onOpenOrigin: onOpenRecordOrigin, onPrimary: () => openEdit() });
    
    return (
        <div class={`task-row ${compact ? 'task-row--compact' : ''} ${done ? 'task-row--done' : ''}`}>
            <div class="task-row-checkbox-wrapper" onClick={(e) => e.stopPropagation()}>
                <TaskCheckbox done={done} onMarkDone={() => onMarkDone(item.id)} />
            </div>
            
            <div class="task-row-content" onClick={gesture.onClick as any} onDblClick={gesture.onDblClick as any} onTouchEnd={gesture.onTouchEnd as any}>
                <div class="task-row-main">
                    <button type="button" onClick={gesture.onClick as any} onDblClick={gesture.onDblClick as any} onTouchEnd={gesture.onTouchEnd as any} class={`task-row-title ${done ? 'task-done' : ''}`} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}>
                        {item.icon && <span class="icon mr-1">{item.icon}</span>}
                        {visibleTitle}
                    </button>
                    {!done && (
                        <div class="task-row-timer-action" onClick={(e) => e.stopPropagation()}>
                            <TaskSendToTimerButton 
                                taskId={item.id} 
                                timerStatus={timer?.status}
                                onStart={() => timerService?.startOrResume(item.id)}
                            />
                        </div>
                    )}
                </div>
                
                {!compact && showFields.length > 0 && (
                    <div class="task-row-fields" onClick={(e) => e.stopPropagation()}>
                        {showFields.map(fieldKey => (
                            <FieldPill 
                                key={fieldKey} 
                                item={item} 
                                fieldKey={fieldKey} 
                                resolveResourcePath={resolveResourcePath} 
                                allThemes={allThemes} 
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
