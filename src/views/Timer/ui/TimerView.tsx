// src/features/timer/ui/TimerView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useRef, useCallback } from 'preact/hooks';
import { useStore } from '@store/AppStore';
import { useLocalStorage } from '@/hooks/shared';
import { Box, Typography, Button, Paper, Stack, Tooltip } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import type { ActionService } from '@lib/services/core/ActionService';
import type { TimerService } from '@lib/services/core/TimerService';
import type { DataStore } from '@lib/services/core/dataStore';
import { TimerRow } from './TimerRow';
import { App } from 'obsidian';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { QuickInputModal, QuickInputSaveData } from '@/views/QuickInput/ui/QuickInputModal';

interface TimerViewProps {
    app: App;
    actionService: ActionService;
    timerService: TimerService;
    dataStore: DataStore;
}

// [新增] 统一处理鼠标和触摸事件，返回坐标
const getEventCoords = (e: MouseEvent | TouchEvent) => {
    if (e instanceof MouseEvent) {
        return { x: e.clientX, y: e.clientY };
    }
    // 检查是否有触摸点
    if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return null;
};


export function TimerView({ app, actionService, timerService, dataStore }: TimerViewProps) {
    const timers = useStore(state => state.timer.getTimers());
    // [新增] 从状态管理获取可见性状态
    const isVisible = useStore(state => state.isTimerWidgetVisible);
    
    const [position, setPosition] = useLocalStorage('think-timer-position', { x: window.innerWidth - 350, y: 100 });
    const dragStartPos = useRef({ x: 0, y: 0, panelX: 0, panelY: 0 });

    // [修改] onDragMove 现在能处理触摸事件
    const onDragMove = useCallback((e: MouseEvent | TouchEvent) => {
        // 阻止页面滚动等默认触摸行为
        e.preventDefault(); 
        const coords = getEventCoords(e);
        if (!coords) return;

        const dx = coords.x - dragStartPos.current.x;
        const dy = coords.y - dragStartPos.current.y;
        setPosition({ x: dragStartPos.current.panelX + dx, y: dragStartPos.current.panelY + dy });
    }, []);

    // [修改] onDragEnd 现在能处理触摸事件
    const onDragEnd = useCallback(() => {
        window.removeEventListener('mousemove', onDragMove);
        window.removeEventListener('mouseup', onDragEnd);
        window.removeEventListener('touchmove', onDragMove);
        window.removeEventListener('touchend', onDragEnd);
    }, [onDragMove]);

    // [修改] onDragStart 现在能处理触摸事件
    const onDragStart = useCallback((e: MouseEvent | TouchEvent) => {
        const coords = getEventCoords(e);
        if (!coords) return;

        dragStartPos.current = { x: coords.x, y: coords.y, panelX: position.x, panelY: position.y };
        
        // 同时监听鼠标和触摸的移动/结束事件
        window.addEventListener('mousemove', onDragMove);
        window.addEventListener('mouseup', onDragEnd);
        window.addEventListener('touchmove', onDragMove, { passive: false }); // passive: false 允许 preventDefault
        window.addEventListener('touchend', onDragEnd);
    }, [position, onDragMove, onDragEnd]);

    const handleNewTask = () => {
        const config = actionService.getQuickInputConfigForNewTimer();
        
        if (config) {
            const onSaveCallback = (data: QuickInputSaveData) => {
                timerService.createNewTaskAndStart(data);
            };

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
                // [核心修改] 根据 isVisible 状态控制显示或隐藏
                display: isVisible ? 'block' : 'none',
            }}
        >
            <Stack>
                <Box sx={{ display: 'flex', alignItems: 'center', p: '4px 8px', borderBottom: '1px solid', borderColor: 'divider' }}>
                    {/* [核心修改] onMouseDown 和 onTouchStart 都绑定到 onDragStart */}
                    <Box onMouseDown={onDragStart as any} onTouchStart={onDragStart as any} sx={{ cursor: 'move', display: 'flex', alignItems: 'center' }}>
                        <DragIndicatorIcon sx={{ color: 'text.disabled', fontSize: '1.2rem' }} />
                    </Box>
                    <Typography sx={{ flexGrow: 1, fontWeight: 'bold', ml: 1 }}>任务计时器</Typography>
                    <Tooltip title="开始新任务">
                        <Button
                            size="small"
                            startIcon={<AddCircleOutlineIcon />}
                            onClick={handleNewTask}
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
