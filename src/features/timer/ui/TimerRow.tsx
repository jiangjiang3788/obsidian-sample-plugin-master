// src/features/timer/ui/TimerRow.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import PauseIcon from '@mui/icons-material/Pause';
import EditIcon from '@mui/icons-material/Edit';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { DataStore } from '@core/services/dataStore';
import { TimerService } from '@core/services/TimerService';
import type { TimerState } from '@state/AppStore';
import { formatSecondsToHHMMSS } from '@core/utils/date';
import { makeObsUri } from '@core/utils/obsidian';
import type { ActionService } from '@core/services/ActionService';

interface TimerRowProps {
    timer: TimerState;
    actionService: ActionService;
}

export function TimerRow({ timer, actionService }: TimerRowProps) {
    const [displayTime, setDisplayTime] = useState('00:00:00');
    const taskItem = DataStore.instance.queryItems().find(i => i.id === timer.taskId);

    // Effect Hook, 负责驱动当前任务行的时间显示
    useEffect(() => {
        let interval: number | null = null;

        const update = () => {
            const now = Date.now();
            const currentSessionSeconds = (now - timer.startTime) / 1000;
            const totalSeconds = timer.elapsedSeconds + currentSessionSeconds;
            setDisplayTime(formatSecondsToHHMMSS(totalSeconds));
        };

        if (timer.status === 'running') {
            update(); // 立即更新一次
            interval = window.setInterval(update, 1000);
        } else {
            // 如果是暂停状态，显示已累计的时间
            setDisplayTime(formatSecondsToHHMMSS(timer.elapsedSeconds));
        }

        // 清理函数
        return () => {
            if (interval) {
                window.clearInterval(interval);
            }
        };
    }, [timer]); // 当timer对象本身（状态、开始时间等）变化时，重新执行effect

    const handleEdit = () => {
        if (taskItem) {
            actionService.editTaskInQuickInput(taskItem.id);
        }
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            <Tooltip title={`点击跳转: ${taskItem?.title}`}>
                <a href={taskItem ? makeObsUri(taskItem) : '#'} style={{ flexGrow: 1, minWidth: 0, textDecoration: 'none', color: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Typography variant="body2" noWrap>{taskItem?.title || '任务已不存在'}</Typography>
                </a>
            </Tooltip>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{displayTime}</Typography>
            
            {/* 控制按钮 */}
            {timer.status === 'running' ? (
                <Tooltip title="暂停"><IconButton size="small" onClick={() => TimerService.pause(timer.id)}><PauseIcon fontSize="inherit" /></IconButton></Tooltip>
            ) : (
                <Tooltip title="继续"><IconButton size="small" onClick={() => TimerService.resume(timer.id)} color="primary"><PlayArrowIcon fontSize="inherit" /></IconButton></Tooltip>
            )}
            <Tooltip title="停止并记录"><IconButton size="small" onClick={() => TimerService.stopAndApply(timer.id)}><StopIcon fontSize="inherit" /></IconButton></Tooltip>
            <Tooltip title="编辑任务"><IconButton size="small" onClick={handleEdit}><EditIcon fontSize="inherit" /></IconButton></Tooltip>
            <Tooltip title="取消任务"><IconButton size="small" onClick={() => TimerService.cancel(timer.id)} color="error"><DeleteForeverIcon fontSize="inherit" /></IconButton></Tooltip>
        </Box>
    );
}