// src/features/timer/ui/TimerView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useRef, useCallback } from 'preact/hooks';
import { useStore } from '@state/AppStore';
import { usePersistentState } from '@shared/hooks/usePersistentState';
import { Box, Typography, Button, Paper, Stack, Tooltip } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import type { ActionService } from '@core/services/ActionService';
import type { TimerService } from '@core/services/TimerService'; // [新增]
import type { DataStore } from '@core/services/dataStore'; // [新增]
import { TimerRow } from './TimerRow';
import { App } from 'obsidian'; // [新增]
import { QuickInputModal } from '@features/quick-input/ui/QuickInputModal'; // [新增]

interface TimerViewProps {
    app: App; // [新增]
    actionService: ActionService;
    timerService: TimerService; // [新增]
    dataStore: DataStore;     // [新增]
}

export function TimerView({ app, actionService, timerService, dataStore }: TimerViewProps) {
    const timers = useStore(state => state.timers);
    
    const [position, setPosition] = usePersistentState('think-timer-position', { x: window.innerWidth - 350, y: 100 });
    const dragStartPos = useRef({ x: 0, y: 0, panelX: 0, panelY: 0 });

    const onDragStart = useCallback((e: MouseEvent) => {
        dragStartPos.current = { x: e.clientX, y: e.clientY, panelX: position.x, panelY: position.y };
        window.addEventListener('mousemove', onDragMove);
        window.addEventListener('mouseup', onDragEnd);
    }, [position]);

    const onDragMove = useCallback((e: MouseEvent) => {
        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;
        setPosition({ x: dragStartPos.current.panelX + dx, y: dragStartPos.current.panelY + dy });
    }, []);

    const onDragEnd = useCallback(() => {
        window.removeEventListener('mousemove', onDragMove);
        window.removeEventListener('mouseup', onDragEnd);
    }, []);

    // [新增] 处理 "新任务" 按钮点击事件
    const handleNewTask = () => {
        const result = actionService.getQuickInputConfigForNewTimer();
        if (result) {
            const { config, onSave } = result;
            new QuickInputModal(app, config.blockId, config.context, undefined, onSave).open();
        }
    };

    return (
        <Paper 
            elevation={4}
            sx={{
                position: 'fixed',
                top: `${position.y}px`,
                left: `${position.x}px`,
                zIndex: 9999,
                userSelect: 'none',
                minWidth: '320px',
            }}
        >
            <Stack>
                <Box sx={{ display: 'flex', alignItems: 'center', p: '4px 8px', borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box onMouseDown={onDragStart} sx={{ cursor: 'move', display: 'flex', alignItems: 'center' }}>
                        <DragIndicatorIcon sx={{ color: 'text.disabled', fontSize: '1.2rem' }} />
                    </Box>
                    <Typography sx={{ flexGrow: 1, fontWeight: 'bold', ml: 1 }}>任务计时器</Typography>
                    <Tooltip title="开始新任务">
                        <Button
                            size="small"
                            startIcon={<AddCircleOutlineIcon />}
                            onClick={handleNewTask} // [修改] 调用新的处理函数
                        >
                            新任务
                        </Button>
                    </Tooltip>
                </Box>
                
                <Stack spacing={1} sx={{ p: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                    {timers.length > 0 ? (
                        timers.map(timer => (
                            // [修改] 将所有需要的实例通过 props 传递给 TimerRow
                            <TimerRow 
                                key={timer.id} 
                                timer={timer} 
                                actionService={actionService} 
                                timerService={timerService}
                                dataStore={dataStore}
                                app={app}
                            />
                        ))
                    ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', p: 2 }}>
                            没有正在计时的任务
                        </Typography>
                    )}
                </Stack>
            </Stack>
        </Paper>
    );
}