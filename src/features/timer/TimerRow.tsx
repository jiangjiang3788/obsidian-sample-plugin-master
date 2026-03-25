// src/features/timer/ui/TimerRow.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Box, IconAction, Typography, Tooltip } from '@shared/public';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import PauseIcon from '@mui/icons-material/Pause';
import EditIcon from '@mui/icons-material/Edit';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { DataStore } from '@core/public';
import { TimerService } from '@features/timer/TimerService';
import type { TimerState } from '@/app/public';
import { formatSecondsToHHMMSS } from '@core/public';
import { openEditFromItem } from '@/app/actions/recordUiActions';
import { createRecordGestureHandlers } from '@/shared/ui/utils/recordOrigin';

interface TimerRowProps {
    timer: TimerState;
    timerService: TimerService;
    dataStore: DataStore;
    app: any;
}

export function TimerRow({ timer, timerService, dataStore, app }: TimerRowProps) {
    const [displayTime, setDisplayTime] = useState('00:00:00');
    const taskItem = dataStore.queryItems().find(i => i.id === timer.taskId);

    useEffect(() => {
        let interval: number | null = null;

        const update = () => {
            const now = Date.now();
            const currentSessionSeconds = (now - timer.startTime) / 1000;
            const totalSeconds = timer.elapsedSeconds + currentSessionSeconds;
            setDisplayTime(formatSecondsToHHMMSS(totalSeconds));
        };

        if (timer.status === 'running') {
            update();
            interval = window.setInterval(update, 1000);
        } else {
            setDisplayTime(formatSecondsToHHMMSS(timer.elapsedSeconds));
        }

        return () => {
            if (interval) {
                window.clearInterval(interval);
            }
        };
    }, [timer]);

    const handleEdit = () => {
        if (taskItem) {
            openEditFromItem({ app, item: taskItem });
        }
    };

    const titleGesture = taskItem ? createRecordGestureHandlers({ item: taskItem, app, onPrimary: handleEdit }) : null;

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            <Tooltip title={taskItem ? `点击编辑；Ctrl/⌘+点击或双击打开原文：${taskItem?.title}` : '任务已不存在'}>
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
                    onClick={titleGesture ? (titleGesture.onClick as any) : undefined}
                    onDblClick={titleGesture ? (titleGesture.onDblClick as any) : undefined}
                    onTouchEnd={titleGesture ? (titleGesture.onTouchEnd as any) : undefined}
                >
                    <Typography variant="body2" noWrap>{taskItem?.title || '任务已不存在'}</Typography>
                </div>
            </Tooltip>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{displayTime}</Typography>
            
            {timer.status === 'running' ? (
                <IconAction label="暂停" onClick={() => timerService.pause(timer.id)} icon={<PauseIcon fontSize="inherit" />} />
            ) : (
                <IconAction label="继续" onClick={() => timerService.resume(timer.id)} color="primary" icon={<PlayArrowIcon fontSize="inherit" />} />
            )}
            <IconAction label="停止并记录" onClick={() => timerService.stopAndApply(timer.id)} icon={<StopIcon fontSize="inherit" />} />
            <IconAction label="编辑任务" onClick={handleEdit} icon={<EditIcon fontSize="inherit" />} />
            <IconAction label="取消任务" onClick={() => timerService.cancel(timer.id)} color="error" icon={<DeleteForeverIcon fontSize="inherit" />} />
        </Box>
    );
}
