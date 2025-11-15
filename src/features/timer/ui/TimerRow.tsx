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
import { DataStore } from '@core/services/DataStore';
import { TimerService } from '@core/services/TimerService';
import type { TimerState } from '@core/stores/AppStore';
import { formatSecondsToHHMMSS } from '@core/utils/date';
import { makeObsUri } from '@core/utils/obsidian';
import type { ActionService } from '@core/services/ActionService';
import { App } from 'obsidian';
// [修改] 导入 QuickInputModal 以修复 handleEdit 功能
import { QuickInputModal } from '../../quickinput/QuickInputModal';

interface TimerRowProps {
    timer: TimerState;
    actionService: ActionService;
    timerService: TimerService;
    dataStore: DataStore;
    app: App;
}

export function TimerRow({ timer, actionService, timerService, dataStore, app }: TimerRowProps) {
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
            const config = actionService.getQuickInputConfigForTaskEdit(taskItem.id);
            if (config) {
                // [核心修改] 调用简化后的构造函数
                new QuickInputModal(app, config.blockId, config.context).open();
            }
        }
    };

    return (
        // @ts-ignore
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            {/* @ts-ignore */}
            <Tooltip title={`点击跳转: ${taskItem?.title}`}>
                <a href={taskItem ? makeObsUri(taskItem, app) : '#'} style={{ flexGrow: 1, minWidth: 0, textDecoration: 'none', color: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Typography variant="body2" noWrap>{taskItem?.title || '任务已不存在'}</Typography>
                </a>
            </Tooltip>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{displayTime}</Typography>
            
            {timer.status === 'running' ? (
                // @ts-ignore
                <Tooltip title="暂停"><IconButton size="small" onClick={() => timerService.pause(timer.id)}><PauseIcon fontSize="inherit" /></IconButton></Tooltip>
            ) : (
                // @ts-ignore
                <Tooltip title="继续"><IconButton size="small" onClick={() => timerService.resume(timer.id)} color="primary"><PlayArrowIcon fontSize="inherit" /></IconButton></Tooltip>
            )}
            {/* @ts-ignore */}
            <Tooltip title="停止并记录"><IconButton size="small" onClick={() => timerService.stopAndApply(timer.id)}><StopIcon fontSize="inherit" /></IconButton></Tooltip>
            {/* @ts-ignore */}
            <Tooltip title="编辑任务"><IconButton size="small" onClick={handleEdit}><EditIcon fontSize="inherit" /></IconButton></Tooltip>
            {/* @ts-ignore */}
            <Tooltip title="取消任务"><IconButton size="small" onClick={() => timerService.cancel(timer.id)} color="error"><DeleteForeverIcon fontSize="inherit" /></IconButton></Tooltip>
        </Box>
    );
}
