/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item, ThemeDefinition } from '@core/public';
import { TaskCheckbox } from '@shared/ui/composites/TaskCheckbox';
import { TaskSendToTimerButton } from '@shared/ui/composites/TaskSendToTimerButton';
import { isDone } from '@core/public';
import { FieldPill } from './FieldPill';
import type { TimerController } from '@/app/public';
import { QuickInputModal } from '@/app/public';

interface TaskRowProps {
    item: Item;
    onMarkDone: (id: string) => void;
    app: any;
    timerService: TimerController;
    timer?: any;
    allThemes: ThemeDefinition[];
    showFields?: string[];
    compact?: boolean;
}

export function TaskRow({ 
    item, 
    onMarkDone, 
    app, 
    timerService, 
    timer, 
    allThemes,
    showFields = [],
    compact = false
}: TaskRowProps) {
    const done = isDone(item.categoryKey);

    const openEdit = (evt?: Event) => {
        evt?.preventDefault?.();
        evt?.stopPropagation?.();
        new QuickInputModal(app, item.templateId || item.categoryKey || '', undefined, undefined, undefined, false, {
            mode: 'edit',
            editItem: item,
        }).open();
    };
    
    return (
        <div class={`task-row ${compact ? 'task-row--compact' : ''} ${done ? 'task-row--done' : ''}`}>
            <div class="task-row-checkbox-wrapper" onClick={(e) => e.stopPropagation()}>
                <TaskCheckbox done={done} onMarkDone={() => onMarkDone(item.id)} />
            </div>
            
            <div class="task-row-content" onClick={openEdit as any}>
                <div class="task-row-main">
                    <button type="button" onClick={openEdit as any} class={`task-row-title ${done ? 'task-done' : ''}`} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}>
                        {item.icon && <span class="icon mr-1">{item.icon}</span>}
                        {item.title}
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
