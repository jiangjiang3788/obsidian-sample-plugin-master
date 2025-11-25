/** @jsxImportSource preact */
import { h } from 'preact';
import { App } from 'obsidian';
import type { Item, ThemeDefinition } from '@/core/types/schema';
import { makeObsUri } from '@core/utils/obsidian';
import { TaskCheckbox } from '@shared/ui/composites/TaskCheckbox';
import { TaskSendToTimerButton } from '@shared/ui/composites/TaskSendToTimerButton';
import { isDone } from '@core/utils/taskUtils';
import { FieldPill } from './FieldPill';
import type { TimerService } from '@features/timer/TimerService';

interface TaskRowProps {
    item: Item;
    onMarkDone: (id: string) => void;
    app: App;
    timerService: TimerService;
    timer?: any;
    allThemes: ThemeDefinition[];
    showFields?: string[];
    compact?: boolean;
}

/**
 * 通用任务行组件 - 可在 BlockView, TableView 等多个视图间复用
 */
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
    
    return (
        <div class={`task-row ${compact ? 'task-row--compact' : ''} ${done ? 'task-row--done' : ''}`}>
            <div class="task-row-checkbox-wrapper">
                <TaskCheckbox done={done} onMarkDone={() => onMarkDone(item.id)} />
            </div>
            
            <div class="task-row-content">
                <div class="flex items-center gap-2">
                    <a href={makeObsUri(item, app)} target="_blank" rel="noopener" class={`task-row-title ${done ? 'task-done' : ''}`}>
                        {item.icon && <span class="icon mr-1">{item.icon}</span>}
                        {item.title}
                    </a>
                    {!done && (
                        <TaskSendToTimerButton 
                            taskId={item.id} 
                            timerStatus={timer?.status}
                            onStart={() => timerService?.startOrResume(item.id)}
                        />
                    )}
                </div>
                
                {/* 可选的字段显示 */}
                {!compact && showFields.length > 0 && (
                    <div class="task-row-fields">
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
