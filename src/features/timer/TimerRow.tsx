// src/features/timer/ui/TimerRow.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import {
  Box,
  Button,
  DeleteForeverIcon,
  EditIcon,
  IconAction,
  PauseIcon,
  PlayArrowIcon,
  StopIcon,
  Tooltip,
  Typography,
  createRecordGestureHandlers,
  RECORD_GESTURE_HINT,
} from '@shared/ui/public';
import type { DataStore } from '@core/services/public';
import type { RecordViewItem } from '@core/types/public';
import { isTaskRecurring } from '@core/records/public';
import { TimerService } from '@features/timer/TimerService';
import type { TimerState } from '@/app/public';
import { formatSecondsToHHMMSS } from '@core/utils/public';

interface TimerRowProps {
    timer: TimerState;
    timerService: TimerService;
    dataStore: DataStore;
    onOpenRecord: (item: RecordViewItem) => void;
    onOpenRecordOrigin: (item: RecordViewItem) => void;
}

function elapsedSecondsAt(timer: TimerState, now: number): number {
    if (timer.status !== 'running') return timer.elapsedSeconds;
    return timer.elapsedSeconds + Math.max(0, (now - timer.startTime) / 1000);
}

export function TimerRow({ timer, timerService, dataStore, onOpenRecord, onOpenRecordOrigin }: TimerRowProps) {
    const [elapsedSeconds, setElapsedSeconds] = useState(() => elapsedSecondsAt(timer, Date.now()));
    const taskItem = dataStore.queryItems().find(i => i.id === timer.taskId);
    const recurringTask = taskItem ? isTaskRecurring(taskItem) : false;

    useEffect(() => {
        let interval: number | null = null;
        const update = () => setElapsedSeconds(elapsedSecondsAt(timer, Date.now()));
        update();
        if (timer.status === 'running') interval = window.setInterval(update, 1000);
        return () => {
            if (interval) window.clearInterval(interval);
        };
    }, [timer]);

    const handleEdit = () => {
        if (taskItem) onOpenRecord(taskItem);
    };

    const titleGesture = taskItem ? createRecordGestureHandlers({
        item: taskItem,
        onOpenOrigin: onOpenRecordOrigin,
        onPrimary: handleEdit,
    }) : null;

    return (
        <div class="think-timer-row">
            {timer.energyContext?.suggestedDurationMinutes ? (
                <div class="think-timer-row__suggested-duration">
                    建议工作块 {timer.energyContext.suggestedDurationMinutes}min
                </div>
            ) : null}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                <Tooltip title={taskItem ? `${RECORD_GESTURE_HINT}：${taskItem?.title}` : '\u4efb\u52a1\u5df2\u4e0d\u5b58\u5728'}>
                    <div
                        style={{
                            flexGrow: 1,
                            minWidth: 0,
                            textDecoration: 'none',
                            color: 'inherit',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            cursor: taskItem ? 'pointer' : 'default'
                        }}
                        role={taskItem ? 'button' : undefined}
                        tabIndex={taskItem ? 0 : undefined}
                        onClick={titleGesture ? (titleGesture.onClick as any) : undefined}
                        onDblClick={titleGesture ? (titleGesture.onDblClick as any) : undefined}
                        onTouchEnd={titleGesture ? (titleGesture.onTouchEnd as any) : undefined}
                        onKeyDown={titleGesture ? (titleGesture.onKeyDown as any) : undefined}
                    >
                        <Typography variant="body2" noWrap>{taskItem?.title || '\u4efb\u52a1\u5df2\u4e0d\u5b58\u5728'}</Typography>
                    </div>
                </Tooltip>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{formatSecondsToHHMMSS(elapsedSeconds)}</Typography>

                {timer.status === 'running' ? (
                    <IconAction label={'\u6682\u505c'} onClick={() => timerService.pause(timer.id)} icon={<PauseIcon fontSize="inherit" />} />
                ) : (
                    <IconAction label={'\u7ee7\u7eed'} onClick={() => timerService.resume(timer.id)} color="primary" icon={<PlayArrowIcon fontSize="inherit" />} />
                )}
                {recurringTask ? (
                    <IconAction label={'完成本次'} onClick={() => timerService.stopAndApply(timer.id)} icon={<StopIcon fontSize="inherit" />} />
                ) : (
                    <>
                        <IconAction label={'结束本次'} onClick={() => timerService.endWorkBlock(timer.id)} icon={<StopIcon fontSize="inherit" />} />
                        <Button size="small" variant="text" onClick={() => timerService.stopAndApply(timer.id)}>完成任务</Button>
                    </>
                )}
                <IconAction label={'\u7f16\u8f91\u4efb\u52a1'} onClick={handleEdit} icon={<EditIcon fontSize="inherit" />} />
                <IconAction label={'\u53d6\u6d88\u4efb\u52a1'} onClick={() => timerService.cancel(timer.id)} color="error" icon={<DeleteForeverIcon fontSize="inherit" />} />
            </Box>

        </div>
    );
}
