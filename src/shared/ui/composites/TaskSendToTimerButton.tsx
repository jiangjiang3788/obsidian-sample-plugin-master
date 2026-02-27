// src/shared/components/TaskSendToTimerButton.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { IconAction } from '@shared/public';
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
            <IconAction
                label={`该任务已在计时面板中 (${timerStatus})`}
                color="primary"
                sx={{ cursor: 'default' }}
                icon={<HourglassTopIcon fontSize="small" />}
            />
        );
    }

    return (
        <IconAction label="添加并开始计时" onClick={onStart} icon={<PlayArrowIcon fontSize="small" />} />
    );
}
