/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item, ThemeDefinition } from '@core/public';
import { TaskCheckbox } from '@shared/ui/composites/TaskCheckbox';
import { TaskSendToTimerButton } from '@shared/ui/composites/TaskSendToTimerButton';
import { isDone } from '@core/public';
import { FieldPill } from './FieldPill';
import type { TimerController } from '@/app/public';
import { openEditFromItem } from '@/app/public';
import { createRecordGestureHandlers } from '@/shared/ui/utils/recordOrigin';

interface TaskRowProps {
    item: Item;
    onMarkDone: (id: string) => void;
    app: any;
    timerService: TimerController;
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
    app, 
    timerService, 
    timer, 
    allThemes,
    showFields = [],
    compact = false,
    displayTitle
}: TaskRowProps) {
    const done = isDone(item.categoryKey);
    const visibleTitle = String(displayTitle ?? item.content ?? item.title ?? '').trim() || item.title;

    const openEdit = (evt?: Event) => {
        evt?.preventDefault?.();
        evt?.stopPropagation?.();
        openEditFromItem({ app, item });
    };

    const gesture = createRecordGestureHandlers({ item, app, onPrimary: () => openEdit() });
    
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
                                app={app} 
                                allThemes={allThemes} 
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
