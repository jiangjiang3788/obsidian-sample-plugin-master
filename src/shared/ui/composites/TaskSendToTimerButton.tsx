// src/shared/components/TaskSendToTimerButton.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { ThinkIcon } from '../primitives/Icon';
import { ThinkIconButton } from '../primitives/IconButton';

interface TaskSendToTimerButtonProps {
    timerStatus?: 'running' | 'paused';
    onStart: () => void | Promise<void>;
    repeat?: boolean;
}

/**
 * Task-row execution control.
 * - no Timer: create + start
 * - paused Timer: resume from the same Task row
 * - running Timer: display active state; the Timer panel owns pause/end controls
 *
 * Runtime rows consume the shared Think icon-button primitive directly so their
 * action sizing and hover state stay aligned with the rest of the plugin.
 */
export function TaskSendToTimerButton({ timerStatus, onStart, repeat = false }: TaskSendToTimerButtonProps) {
    if (timerStatus === 'running') {
        return (
            <ThinkIconButton
                label="正在计时"
                size="sm"
                pressed
                className="task-timer-button is-running"
                tabIndex={-1}
                icon={<ThinkIcon name="hourglass" />}
            />
        );
    }

    if (timerStatus === 'paused') {
        return (
            <ThinkIconButton
                label="继续计时"
                size="sm"
                className="task-timer-button"
                onClick={() => { void onStart(); }}
                icon={<ThinkIcon name="play" />}
            />
        );
    }

    return (
        <ThinkIconButton
            label={repeat ? "再次执行并开始计时" : "添加并开始计时"}
            size="sm"
            className="task-timer-button"
            onClick={() => { void onStart(); }}
            icon={<ThinkIcon name="play" />}
        />
    );
}
