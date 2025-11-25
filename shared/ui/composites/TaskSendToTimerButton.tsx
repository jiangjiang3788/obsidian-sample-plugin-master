// src/shared/components/TaskSendToTimerButton.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { IconButton, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';

interface TaskSendToTimerButtonProps {
    taskId: string;
    timerStatus?: 'running' | 'paused';
    onStart: () => void;
}

/**
 * 任务列表中的“发送到计时器”按钮 (多任务版本)。
 * - 如果任务已在计时器中，显示激活状态。
 * - 否则，显示播放按钮以添加并开始计时。
 */
export function TaskSendToTimerButton({ taskId, timerStatus, onStart }: TaskSendToTimerButtonProps) {
    if (timerStatus) {
        return (
            <Tooltip title={`该任务已在计时面板中 (${timerStatus})`}>
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
                onClick={(e) => {
                    e.stopPropagation();
                    onStart();
                }} 
            >
                <PlayArrowIcon fontSize="small" />
            </IconButton>
        </Tooltip>
    );
}
