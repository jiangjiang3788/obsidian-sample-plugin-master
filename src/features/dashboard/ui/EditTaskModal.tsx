// src/features/dashboard/ui/EditTaskModal.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect } from 'preact/hooks';
import type { TaskBlock } from '@/features/dashboard/views/timeline/timeline-parser';
import { TaskService } from '@core/services/TaskService';
import { timeToMinutes, minutesToTime } from '@core/utils/date';
import { Modal } from '@/ui/primitives/Modal';
import { FormField } from '@/ui/composites/FormField';
import { useTimeFormState, useSaveHandler } from '@shared/index';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskBlock;
  taskService?: TaskService;
  onSave?: () => void;
}

export function EditTaskModal({ isOpen, onClose, task, taskService, onSave }: EditTaskModalProps) {
  // 使用专门的时间表单状态管理
  const formState = useTimeFormState({
    startTime: minutesToTime(task.startMinute),
    endTime: minutesToTime(task.endMinute),
    duration: String(task.duration)
  });

  const { state: timeData, updateField, lastChanged } = formState;

  // 智能时间计算逻辑
  useEffect(() => {
    const start = timeData.startTime;
    const end = timeData.endTime;
    const durationStr = String(timeData.duration);
    const duration = !isNaN(parseInt(durationStr)) ? parseInt(durationStr) : null;
    
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);
    
    let changes: Record<string, any> = {};

    // 优先级 1: 开始和结束时间都有效，计算时长
    if (startMinutes !== null && endMinutes !== null && lastChanged !== 'duration') {
      let newDuration = endMinutes - startMinutes;
      if (newDuration < 0) newDuration += 24 * 60; // 跨天
      if (newDuration !== duration) {
        changes.duration = String(newDuration);
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
      Object.entries(changes).forEach(([field, value]) => {
        updateField(field as keyof typeof timeData, value);
      });
    }
  }, [timeData, lastChanged, updateField]);

  // 验证函数
  const validateTimeData = () => {
    if (!taskService) {
      throw new Error('TaskService 未提供，无法保存');
    }

    const startM = timeToMinutes(timeData.startTime);
    const endM = timeToMinutes(timeData.endTime);
    const duration = Number(timeData.duration);

    if (startM === null || (timeData.endTime && endM === null) || isNaN(duration)) {
      throw new Error('请输入有效的时间和时长');
    }

    // 最终数据准备
    let finalDuration = duration;
    if (startM !== null && endM !== null) {
      let calculatedDuration = endM - startM;
      if (calculatedDuration < 0) calculatedDuration += 24 * 60;
      finalDuration = calculatedDuration;
    }

    return {
      time: timeData.startTime,
      endTime: timeData.endTime,
      duration: finalDuration,
    };
  };

  // 使用统一的保存处理模式
  const handleSave = useSaveHandler(async () => {
    const timeUpdateData = validateTimeData();
    await taskService!.updateTaskTime(task.id, timeUpdateData);
    onSave?.();
    onClose();
  }, {
    successMessage: '任务时间已更新',
    errorMessage: '更新失败'
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑任务时间"
      onSave={handleSave}
      saveButtonText="保存"
      size="medium"
    >
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ 
          fontSize: '0.9em', 
          color: 'var(--text-muted)', 
          maxWidth: '400px', 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis' 
        }}>
          {task.pureText}
        </p>
      </div>

      <FormField label="开始时间">
        <input 
          type="time" 
          value={timeData.startTime} 
          onInput={e => updateField('startTime', (e.target as HTMLInputElement).value)}
          style={{ width: '100%' }}
        />
      </FormField>

      <FormField label="结束时间">
        <input 
          type="time" 
          value={timeData.endTime} 
          onInput={e => updateField('endTime', (e.target as HTMLInputElement).value)}
          style={{ width: '100%' }}
        />
      </FormField>

      <FormField 
        label="持续时长" 
        help="单位：分钟"
      >
        <input 
          type="number" 
          min="0" 
          value={timeData.duration} 
          onInput={e => updateField('duration', (e.target as HTMLInputElement).value)}
          style={{ width: '100%' }}
        />
      </FormField>
    </Modal>
  );
}
