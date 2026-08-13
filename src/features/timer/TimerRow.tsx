// src/features/timer/ui/TimerRow.tsx
/** @jsxImportSource preact */
import { useEffect, useState } from 'preact/hooks';
import {
  DeleteForeverIcon,
  EditIcon,
  PauseIcon,
  PlayArrowIcon,
  StopIcon,
  ThinkButton,
  ThinkIconButton,
  createRecordGestureHandlers,
  RECORD_GESTURE_HINT,
} from '@shared/ui/public';
import type { DataStore } from '@core/services/public';
import type { RecordViewItem } from '@core/types/public';
import { isTaskRecurring } from '@core/records/public';
import type { TimerService } from '@features/timer/TimerService';
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

function timerClock(timer: TimerState, elapsedSeconds: number): { label: string; title: string; countdown: boolean } {
    const suggestedMinutes = Number(timer.energyContext?.suggestedDurationMinutes);
    if (!Number.isFinite(suggestedMinutes) || suggestedMinutes <= 0) {
        return { label: formatSecondsToHHMMSS(elapsedSeconds), title: '已计时', countdown: false };
    }
    const targetSeconds = Math.max(60, Math.round(suggestedMinutes * 60));
    const remaining = targetSeconds - elapsedSeconds;
    if (remaining >= 0) {
        return { label: formatSecondsToHHMMSS(remaining), title: `建议倒计时 ${suggestedMinutes} 分钟`, countdown: true };
    }
    return { label: `+${formatSecondsToHHMMSS(Math.abs(remaining))}`, title: `已超过建议工作块 ${suggestedMinutes} 分钟`, countdown: true };
}

export function TimerRow({ timer, timerService, dataStore, onOpenRecord, onOpenRecordOrigin }: TimerRowProps) {
    const [elapsedSeconds, setElapsedSeconds] = useState(() => elapsedSecondsAt(timer, Date.now()));
    const taskItem = dataStore.queryItems().find((item) => item.id === timer.taskId);
    const recurringTask = taskItem ? isTaskRecurring(taskItem) : false;
    const clock = timerClock(timer, elapsedSeconds);

    useEffect(() => {
        let interval: number | null = null;
        const update = () => setElapsedSeconds(elapsedSecondsAt(timer, Date.now()));
        update();
        if (timer.status === 'running') interval = window.setInterval(update, 1000);
        return () => { if (interval) window.clearInterval(interval); };
    }, [timer]);

    const handleEdit = () => { if (taskItem) onOpenRecord(taskItem); };
    const titleGesture = taskItem ? createRecordGestureHandlers({ item: taskItem, onOpenOrigin: onOpenRecordOrigin, onPrimary: handleEdit }) : null;

    return (
        <div className="think-timer-row">
            <div className="think-timer-row__main">
                <div
                    className={`think-timer-row__title${taskItem ? ' is-clickable' : ''}`}
                    title={taskItem ? `${RECORD_GESTURE_HINT}：${taskItem.title}` : '任务已不存在'}
                    role={taskItem ? 'button' : undefined}
                    tabIndex={taskItem ? 0 : undefined}
                    onClick={titleGesture ? (titleGesture.onClick as any) : undefined}
                    onDblClick={titleGesture ? (titleGesture.onDblClick as any) : undefined}
                    onTouchEnd={titleGesture ? (titleGesture.onTouchEnd as any) : undefined}
                    onKeyDown={titleGesture ? (titleGesture.onKeyDown as any) : undefined}
                >{taskItem?.title || '任务已不存在'}</div>
                <span className={`think-timer-row__clock${clock.countdown ? ' think-timer-row__countdown' : ''}`} title={clock.title}>{clock.label}</span>
                <div className="think-timer-row__actions">
                    {timer.status === 'running' ? (
                        <ThinkIconButton label="暂停" size="sm" onClick={() => timerService.pause(timer.id)} icon={<PauseIcon fontSize="small" />} />
                    ) : (
                        <ThinkIconButton label="继续" size="sm" onClick={() => timerService.resume(timer.id)} icon={<PlayArrowIcon fontSize="small" />} />
                    )}
                    {recurringTask ? (
                        <ThinkIconButton label="完成本次" size="sm" onClick={() => timerService.stopAndApply(timer.id)} icon={<StopIcon fontSize="small" />} />
                    ) : (
                        <>
                            <ThinkIconButton label="结束本次" size="sm" onClick={() => timerService.endWorkBlock(timer.id)} icon={<StopIcon fontSize="small" />} />
                            <ThinkButton size="sm" variant="ghost" onClick={() => timerService.stopAndApply(timer.id)}>完成任务</ThinkButton>
                        </>
                    )}
                    <ThinkIconButton label="编辑任务" size="sm" onClick={handleEdit} icon={<EditIcon fontSize="small" />} />
                    <ThinkIconButton label="取消任务" size="sm" tone="danger" onClick={() => timerService.cancel(timer.id)} icon={<DeleteForeverIcon fontSize="small" />} />
                </div>
            </div>
        </div>
    );
}
