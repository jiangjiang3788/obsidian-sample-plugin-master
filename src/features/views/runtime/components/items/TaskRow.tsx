/** @jsxImportSource preact */
import { h } from 'preact';
import type { RecordViewItem } from '@core/types/public';
import { TaskCheckbox } from '@shared/ui/public';
import { TaskSendToTimerButton } from '@shared/ui/public';
import { isItemDone, normalizeTaskStatus } from '@core/utils/public';
import { FieldPill } from './FieldPill';
import type { OpenRecordHandler, OpenRecordOriginHandler, ResolveResourcePathHandler, TimerController } from '@shared/types/public';
import { createRecordGestureHandlers, RECORD_GESTURE_HINT } from '@shared/ui/public';

interface TaskRowProps {
    item: RecordViewItem;
    onMarkDone: (id: string) => void;
    resolveResourcePath?: ResolveResourcePathHandler;
    onOpenRecordOrigin?: OpenRecordOriginHandler;
    timerService: TimerController;
    onOpenRecord?: OpenRecordHandler;
    timer?: any;
    showFields?: string[];
    compact?: boolean;
    /** 可选展示标题。用于 EventTimelineView 等视图按配置字段展示任务正文，而不改变 item.title 真值。 */
    displayTitle?: string;
    /** Render as a full-width runtime list row instead of an inline table/timeline cell item. */
    listRow?: boolean;
}


export function TaskRow({ 
    item, 
    onMarkDone, 
    resolveResourcePath,
    onOpenRecordOrigin,
    timerService, 
    timer, 
    showFields = [],
    compact = false,
    displayTitle,
    onOpenRecord,
    listRow = false
}: TaskRowProps) {
    const done = isItemDone(item);
    const taskStatus = normalizeTaskStatus(item.status);
    const canExecute = taskStatus === 'open' || taskStatus === 'done';
    const visibleTitle = String(displayTitle ?? item.content ?? item.title ?? '').trim() || item.title;

    const openEdit = (evt?: Event) => {
        evt?.preventDefault?.();
        evt?.stopPropagation?.();
        void onOpenRecord?.(item);
    };

    const gesture = createRecordGestureHandlers({ item, onOpenOrigin: onOpenRecordOrigin, onPrimary: () => openEdit() });
    
    return (
        <div class={`task-row ${listRow ? 'think-list-row think-list-row--task think-list-row--interactive' : ''} ${compact ? `task-row--compact ${listRow ? 'think-list-row--compact' : ''}` : ''} ${done ? 'task-row--done' : ''}`}>
            <div class="task-row-checkbox-wrapper" onClick={(e) => e.stopPropagation()}>
                <TaskCheckbox done={done} onMarkDone={() => onMarkDone(item.id)} />
            </div>
            
            <div class="task-row-content" onClick={gesture.onClick as never} onDblClick={gesture.onDblClick as never} onTouchEnd={gesture.onTouchEnd as never}>
                <div class="task-row-main">
                    <button type="button" title={RECORD_GESTURE_HINT} onClick={gesture.onClick as never} onDblClick={gesture.onDblClick as never} onTouchEnd={gesture.onTouchEnd as never} onKeyDown={gesture.onKeyDown as never} class={`task-row-title ${done ? 'task-done' : ''}`}>
                        {item.icon && <span class="icon mr-1">{item.icon}</span>}
                        {visibleTitle}
                    </button>
                    {canExecute && (
                        <div class="task-row-timer-action" onClick={(e) => e.stopPropagation()}>
                            <TaskSendToTimerButton 
                                timerStatus={done ? undefined : timer?.status}
                                onStart={() => timerService?.startOrResume(item.id)}
                                repeat={done}
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
                                                  onOpenRecordOrigin={onOpenRecordOrigin}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
