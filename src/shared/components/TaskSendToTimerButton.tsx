// src/shared/components/TaskSendToTimerButton.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore } from '@state/AppStore';
import { TimerService } from '@core/services/TimerService';
import { IconButton, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';

interface TaskSendToTimerButtonProps {
    taskId: string;
}

/**
 * 任务列表中的“发送到计时器”按钮 (多任务版本)。
 * - 如果任务已在计时器中，显示激活状态。
 * - 否则，显示播放按钮以添加并开始计时。
 */
export function TaskSendToTimerButton({ taskId }: TaskSendToTimerButtonProps) {
    const timers = useStore(state => state.timers);
    const thisTaskTimer = timers.find(t => t.taskId === taskId);

    if (thisTaskTimer) {
        return (
            <Tooltip title={`该任务已在计时面板中 (${thisTaskTimer.status})`}>
                <IconButton size="small" color="primary" sx={{ cursor: 'default' }}>
                    <HourglassTopIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        );
    }

    return (
        <Tooltip title="添加并开始计时">
            <IconButton 
                size="small" 
                onClick={() => TimerService.startOrResume(taskId)} 
            >
                <PlayArrowIcon fontSize="small" />
            </IconButton>
        </Tooltip>
    );
}