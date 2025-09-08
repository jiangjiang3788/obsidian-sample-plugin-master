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
import type { TimerService } from '@core/services/TimerService';
import type { DataStore } from '@core/services/dataStore';
import { TimerRow } from './TimerRow';
import { App } from 'obsidian';
// [修改] 导入 QuickInputSaveData 类型
import { QuickInputModal, QuickInputSaveData } from '@features/quick-input/ui/QuickInputModal'; 

interface TimerViewProps {
    app: App;
    actionService: ActionService;
    timerService: TimerService;
    dataStore: DataStore;
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

    /**
     * [核心修改] handleNewTask 现在是服务协调者。
     * 它负责从 ActionService 获取配置，然后定义自己的 onSave 回调来调用 TimerService。
     */
    const handleNewTask = () => {
        // 1. 从 ActionService 获取纯粹的配置，这一步不再需要 TimerService。
        const config = actionService.getQuickInputConfigForNewTimer();
        
        if (config) {
            // 2. 在 UI 层（协调者）定义保存后的具体行为。
            const onSaveCallback = (data: QuickInputSaveData) => {
                // 3. 调用 TimerService 来执行具体的计时业务逻辑。
                timerService.createNewTaskAndStart(data);
            };

            // 4. 将配置和我们自己定义的回调函数传递给 Modal。
            new QuickInputModal(app, config.blockId, config.context, undefined, onSaveCallback).open();
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
                            onClick={handleNewTask} // 调用新的协调函数
                        >
                            新任务
                        </Button>
                    </Tooltip>
                </Box>
                
                <Stack spacing={1} sx={{ p: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                    {timers.length > 0 ? (
                        timers.map(timer => (
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