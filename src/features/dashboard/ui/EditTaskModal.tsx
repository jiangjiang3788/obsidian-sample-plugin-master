// src/features/dashboard/ui/EditTaskModal.tsx
/** @jsxImportSource preact */
import { App, Modal, Notice } from 'obsidian';
import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { TaskBlock } from '@/features/dashboard/views/timeline/timeline-parser';
import { TaskService } from '@core/services/TaskService';
import { timeToMinutes, minutesToTime } from '@core/utils/date'; // [1. 导入时间转换工具]

// [移除] 不再需要旧的、简单的转换函数

// Modal 主类 (无变化)
export class EditTaskModal extends Modal {
    constructor(app: App, private task: TaskBlock, private onSave?: () => void, private taskService?: TaskService) {
        super(app);
    }

    onOpen() {
        this.contentEl.empty();
        render(
            <EditForm 
                task={this.task} 
                close={() => this.close()} 
                onSave={this.onSave}
                taskService={this.taskService}
            />, 
            this.contentEl
        );
    }

    onClose() {
        this.contentEl.empty();
    }
}


// [核心修改] 全面升级 EditForm 组件
function EditForm({ task, close, onSave, taskService }: { task: TaskBlock; close: () => void; onSave?: () => void; taskService?: TaskService }) {
    
    // [2. 状态管理] 使用一个对象来管理所有时间字段，并增加 endTime
    const [timeData, setTimeData] = useState(() => ({
        startTime: minutesToTime(task.startMinute),
        endTime: minutesToTime(task.endMinute),
        duration: String(task.duration),
        lastChanged: null as 'startTime' | 'endTime' | 'duration' | null,
    }));

    // [3. 计算引擎] 移植并适配智能计算逻辑
    useEffect(() => {
        const start = timeData.startTime;
        const end = timeData.endTime;
        const durationStr = String(timeData.duration);
        const duration = !isNaN(parseInt(durationStr)) ? parseInt(durationStr) : null;
        
        const startMinutes = timeToMinutes(start);
        const endMinutes = timeToMinutes(end);
        
        const lastChanged = timeData.lastChanged;
        let changes: Record<string, any> = {};

        // 优先级 1: 开始和结束时间都有效，计算时长
        if (startMinutes !== null && endMinutes !== null && lastChanged !== 'duration') {
            let newDuration = endMinutes - startMinutes;
            if (newDuration < 0) newDuration += 24 * 60; // 跨天
            if (newDuration !== duration) {
                changes.duration = newDuration;
            }
        } 
        // 优先级 2: 开始时间和时长都有效，计算结束时间
        else if (startMinutes !== null && duration !== null && lastChanged !== 'endTime') {
            const newEndTime = minutesToTime(startMinutes + duration);
            if (newEndTime !== end) {
                changes.endTime = newEndTime;
            }
        } 
        // 优先级 3: 结束时间和时长都有效，计算开始时间
        else if (endMinutes !== null && duration !== null && lastChanged !== 'startTime') {
            const newStartTime = minutesToTime(endMinutes - duration);
            if (newStartTime !== start) {
                changes.startTime = newStartTime;
            }
        }

        if (Object.keys(changes).length > 0) {
            setTimeData(current => ({ ...current, ...changes, lastChanged: null }));
        }
    }, [timeData]);

    const handleUpdate = (field: 'startTime' | 'endTime' | 'duration', value: string) => {
        setTimeData(current => ({
            ...current,
            [field]: value,
            lastChanged: field,
        }));
    };

    const handleSave = async () => {
        if (!taskService) {
            new Notice('❌ 内部错误：TaskService 未提供，无法保存。');
            return;
        }

        // [4. 保存前校验] 确保数据一致性
        const finalStartTime = timeData.startTime;
        const finalEndTime = timeData.endTime;
        let finalDuration = Number(timeData.duration);

        const startM = timeToMinutes(finalStartTime);
        const endM = timeToMinutes(finalEndTime);

        if (startM === null || (finalEndTime && endM === null) || isNaN(finalDuration)) {
            new Notice('请输入有效的时间和时长');
            return;
        }

        // 最高优先级：再次根据开始和结束时间覆盖时长
        if (startM !== null && endM !== null) {
            let calculatedDuration = endM - startM;
            if (calculatedDuration < 0) calculatedDuration += 24 * 60;
            finalDuration = calculatedDuration;
        }
        
        try {
            await taskService.updateTaskTime(task.id, {
                time: finalStartTime,
                endTime: finalEndTime,
                duration: finalDuration,
            });
            new Notice('✅ 任务时间已更新');
            onSave?.();
            close();
        } catch (e: any) {
            new Notice(`❌ 更新失败: ${e.message}`);
        }
    };

    return (
        <div class="think-modal">
            <h3>编辑任务时间</h3>
            <p style="font-size: 0.9em; color: var(--text-muted); max-width: 400px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                {task.pureText}
            </p>
            
            {/* [5. UI更新] */}
            <div style="margin-top: 1rem;">
                <label>开始时间</label>
                <input type="time" value={timeData.startTime} onInput={e => handleUpdate('startTime', (e.target as HTMLInputElement).value)} />
            </div>
            <div style="margin-top: 0.5rem;">
                <label>结束时间</label>
                <input type="time" value={timeData.endTime} onInput={e => handleUpdate('endTime', (e.target as HTMLInputElement).value)} />
            </div>
            <div style="margin-top: 0.5rem;">
                <label>持续时长 (分钟)</label>
                <input type="number" min="0" value={timeData.duration} onInput={e => handleUpdate('duration', (e.target as HTMLInputElement).value)} />
            </div>

            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:1.5rem;">
                <button class="mod-cta" onClick={handleSave}>保存</button>
                <button onClick={close}>取消</button>
            </div>
        </div>
    );
}
