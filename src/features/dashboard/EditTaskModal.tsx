// src/features/dashboard/ui/EditTaskModal.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect } from 'preact/hooks';
import type { TaskBlock } from '@features/views/timeline-parser';
import { TaskService } from '@core/services/TaskService';
import { timeToMinutes, minutesToTime } from '@core/utils/date';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
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
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>编辑任务时间</DialogTitle>
      <DialogContent>
        <div style={{ marginBottom: '1rem', marginTop: '0.5rem' }}>
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

        <TextField
          label="开始时间"
          type="time"
          value={timeData.startTime}
          onChange={e => updateField('startTime', (e.target as HTMLInputElement).value)}
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          label="结束时间"
          type="time"
          value={timeData.endTime}
          onChange={e => updateField('endTime', (e.target as HTMLInputElement).value)}
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          label="持续时长 (分钟)"
          type="number"
          value={timeData.duration}
          onChange={e => updateField('duration', (e.target as HTMLInputElement).value)}
          fullWidth
          margin="normal"
          inputProps={{ min: 0 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleSave} variant="contained">保存</Button>
      </DialogActions>
    </Dialog>
  );
}
