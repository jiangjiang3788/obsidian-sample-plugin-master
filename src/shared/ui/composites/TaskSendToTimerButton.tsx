// src/shared/components/TaskSendToTimerButton.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { IconAction } from '../components/IconAction';
import { HourglassTopIcon, PlayArrowIcon } from '../icons';

interface TaskSendToTimerButtonProps {
    taskId: string;
    timerStatus?: 'running' | 'paused';
    onStart: () => void | Promise<void>;
}

/**
 * Task-row execution control.
 * - no Timer: create + start
 * - paused Timer: resume from the same Task row
 * - running Timer: display active state; the Timer panel owns pause/end controls
 */
export function TaskSendToTimerButton({ timerStatus, onStart }: TaskSendToTimerButtonProps) {
    if (timerStatus === 'running') {
        return (
            <IconAction
                label="正在计时"
                color="primary"
                sx={{ cursor: 'default' }}
                icon={<HourglassTopIcon fontSize="small" />}
            />
        );
    }

    if (timerStatus === 'paused') {
        return (
            <IconAction
                label="继续计时"
                color="primary"
                onClick={() => { void onStart(); }}
                icon={<PlayArrowIcon fontSize="small" />}
            />
        );
    }

    return (
        <IconAction label="添加并开始计时" onClick={() => { void onStart(); }} icon={<PlayArrowIcon fontSize="small" />} />
    );
}
