// src/shared/components/TaskSendToTimerButton.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useTimer } from '@shared/hooks/useTimer';
import { IconButton, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';

interface TaskSendToTimerButtonProps {
    taskId: string;
}

/**
 * 任务列表中的“发送到计时器”按钮。
 * - 默认显示播放图标。
 * - 如果是当前正在计时的任务，显示激活状态图标。
 * - 如果有其他任务在计时，则禁用。
 */
export function TaskSendToTimerButton({ taskId }: TaskSendToTimerButtonProps) {
    const { activeTimer, start } = useTimer();
    
    const isThisTaskActive = activeTimer?.taskId === taskId;
    const isAnotherTaskActive = activeTimer && !isThisTaskActive;

    if (isThisTaskActive) {
        return (
            <Tooltip title="当前任务正在计时">
                <IconButton size="small" color="primary" sx={{ cursor: 'default' }}>
                    <HourglassTopIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        );
    }

    return (
        <Tooltip title={isAnotherTaskActive ? "已有其他任务在计时" : "开始计时"}>
            <span> {/* Tooltip 需要包裹一个DOM元素来处理 disabled 状态 */}
                <IconButton 
                    size="small" 
                    onClick={() => start(taskId)} 
                    disabled={isAnotherTaskActive}
                >
                    <PlayArrowIcon fontSize="small" />
                </IconButton>
            </span>
        </Tooltip>
    );
}