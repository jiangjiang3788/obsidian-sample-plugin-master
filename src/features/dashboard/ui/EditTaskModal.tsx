// src/features/dashboard/ui/EditTaskModal.tsx
/** @jsxImportSource preact */
import { App, Modal, Notice } from 'obsidian';
import { h, render } from 'preact';
import { useState } from 'preact/hooks';
import type { TaskBlock } from '../views/timeline/timeline-parser';
import { TaskService } from '@core/services/taskService';

// 格式化分钟为 HH:mm
const formatTime = (minute: number) => {
    const h = Math.floor(minute / 60);
    const m = minute % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// 解析 HH:mm 为分钟
const parseTimeToMinute = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

// Modal 主类
export class EditTaskModal extends Modal {
  constructor(app: App, private task: TaskBlock, private onSave?: () => void) {
    super(app);
  }

  onOpen() {
    this.contentEl.empty();
    render(
      <EditForm 
        task={this.task} 
        close={() => this.close()} 
        onSave={this.onSave}
      />, 
      this.contentEl
    );
  }

  onClose() {
    this.contentEl.empty();
  }
}

// Preact 表单组件
function EditForm({ task, close, onSave }: { task: TaskBlock; close: () => void; onSave?: () => void; }) {
  const [startTime, setStartTime] = useState(formatTime(task.startMinute));
  const [duration, setDuration] = useState(String(task.duration));

  const handleSave = async () => {
    const newStartMinute = parseTimeToMinute(startTime);
    const newDuration = Number(duration);

    if (isNaN(newStartMinute) || isNaN(newDuration) || newDuration <= 0) {
        new Notice('请输入有效的时间和正数时长');
        return;
    }

    try {
        await TaskService.updateTaskTime(task.id, {
            time: startTime,
            duration: newDuration,
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
        <p style="font-size: 0.9em; color: var(--text-muted); max-width: 400px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{task.pureText}</p>
        <div style="margin-top: 1rem;">
            <label>开始时间</label>
            <input type="time" value={startTime} onInput={e => setStartTime((e.target as HTMLInputElement).value)} />
        </div>
        <div style="margin-top: 0.5rem;">
            <label>持续时长 (分钟)</label>
            <input type="number" min="1" value={duration} onInput={e => setDuration((e.target as HTMLInputElement).value)} />
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:1.5rem;">
          <button class="mod-cta" onClick={handleSave}>保存</button>
          <button onClick={close}>取消</button>
      </div>
    </div>
  );
}