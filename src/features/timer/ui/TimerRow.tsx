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
import { App } from 'obsidian'; // [新增] 导入 App 类型

interface TimerRowProps {
    timer: TimerState;
    actionService: ActionService;
    timerService: TimerService; // [新增]
    dataStore: DataStore;     // [新增]
    app: App;                 // [新增]
}

export function TimerRow({ timer, actionService, timerService, dataStore, app }: TimerRowProps) {
    const [displayTime, setDisplayTime] = useState('00:00:00');
    // [修改] 从传入的 dataStore 获取数据
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
            // [修改] 调用新的 service 方法并处理返回的配置
            const config = actionService.getQuickInputConfigForTaskEdit(taskItem.id);
            if (config) {
                // QuickInputModal 现在需要 store 实例，但在这里我们没有简单的方法获取它们。
                // 这是一个待办事项，暂时我们先让它能工作。
                // 理想情况下，应该有一个全局的 UI 服务来打开模态框。
                new (window as any).obsidian.Modal(app).open(); // 临时的
            }
        }
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            <Tooltip title={`点击跳转: ${taskItem?.title}`}>
                {/* [修改] makeObsUri 现在需要 app 实例 */}
                <a href={taskItem ? makeObsUri(taskItem, app) : '#'} style={{ flexGrow: 1, minWidth: 0, textDecoration: 'none', color: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Typography variant="body2" noWrap>{taskItem?.title || '任务已不存在'}</Typography>
                </a>
            </Tooltip>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{displayTime}</Typography>
            
            {/* [修改] 所有按钮调用现在都通过注入的 timerService 实例 */}
            {timer.status === 'running' ? (
                <Tooltip title="暂停"><IconButton size="small" onClick={() => timerService.pause(timer.id)}><PauseIcon fontSize="inherit" /></IconButton></Tooltip>
            ) : (
                <Tooltip title="继续"><IconButton size="small" onClick={() => timerService.resume(timer.id)} color="primary"><PlayArrowIcon fontSize="inherit" /></IconButton></Tooltip>
            )}
            <Tooltip title="停止并记录"><IconButton size="small" onClick={() => timerService.stopAndApply(timer.id)}><StopIcon fontSize="inherit" /></IconButton></Tooltip>
            <Tooltip title="编辑任务"><IconButton size="small" onClick={handleEdit}><EditIcon fontSize="inherit" /></IconButton></Tooltip>
            <Tooltip title="取消任务"><IconButton size="small" onClick={() => timerService.cancel(timer.id)} color="error"><DeleteForeverIcon fontSize="inherit" /></IconButton></Tooltip>
        </Box>
    );
}