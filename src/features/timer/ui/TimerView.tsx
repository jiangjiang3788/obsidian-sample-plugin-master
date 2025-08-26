// src/features/timer/ui/TimerView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useRef, useCallback } from 'preact/hooks';
import { useStore } from '@state/AppStore';
import { usePersistentState } from '@shared/hooks/usePersistentState';
import { Box, Typography, IconButton, Tooltip, Paper, Stack, Button, Divider } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import type { ActionService } from '@core/services/ActionService';
import { TimerRow } from './TimerRow';

interface TimerViewProps {
    actionService: ActionService;
}

/**
 * 全局悬浮、可拖拽的计时器面板UI组件 (多任务版本)。
 */
export function TimerView({ actionService }: TimerViewProps) {
    // 订阅完整的计时器列表
    const timers = useStore(state => state.timers);
    
    // 位置记忆和拖拽逻辑保持不变
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
                {/* 顶部栏：标题、拖拽手柄和新增按钮 */}
                <Box sx={{ display: 'flex', alignItems: 'center', p: '4px 8px', borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box onMouseDown={onDragStart} sx={{ cursor: 'move', display: 'flex', alignItems: 'center' }}>
                        <DragIndicatorIcon sx={{ color: 'text.disabled', fontSize: '1.2rem' }} />
                    </Box>
                    <Typography sx={{ flexGrow: 1, fontWeight: 'bold', ml: 1 }}>任务计时器</Typography>
                    <Tooltip title="开始新任务">
                        <Button
                            size="small"
                            startIcon={<AddCircleOutlineIcon />}
                            onClick={() => actionService.openNewTaskForTimer()}
                        >
                            新任务
                        </Button>
                    </Tooltip>
                </Box>
                
                {/* 任务列表 */}
                <Stack spacing={1} sx={{ p: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                    {timers.length > 0 ? (
                        timers.map(timer => (
                            <TimerRow key={timer.id} timer={timer} actionService={actionService} />
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