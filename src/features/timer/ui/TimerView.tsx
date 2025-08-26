// src/features/timer/ui/TimerView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useRef, useCallback } from 'preact/hooks';
import { useTimer } from '@shared/hooks/useTimer';
import { usePersistentState } from '@shared/hooks/usePersistentState';
import { Box, Typography, IconButton, Tooltip, Paper } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import PauseIcon from '@mui/icons-material/Pause';
import EditIcon from '@mui/icons-material/Edit';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { makeObsUri } from '@core/utils/obsidian';
import type { ActionService } from '@core/services/ActionService';

interface TimerViewProps {
    actionService: ActionService;
}

/**
 * 全局悬浮、可拖拽的计时器面板UI组件。
 */
export function TimerView({ actionService }: TimerViewProps) {
    const { activeTimer, taskItem, displayTime, pause, resume, stop } = useTimer();
    
    // 使用持久化State来记忆面板位置
    const [position, setPosition] = usePersistentState('think-timer-position', { x: window.innerWidth - 300, y: 100 });
    const dragStartPos = useRef({ x: 0, y: 0, panelX: 0, panelY: 0 });

    const handleEdit = () => {
        if (taskItem) {
            actionService.editTaskInQuickInput(taskItem.id);
        }
    };
    
    // 拖拽逻辑
    const onDragStart = useCallback((e: MouseEvent) => {
        dragStartPos.current = {
            x: e.clientX,
            y: e.clientY,
            panelX: position.x,
            panelY: position.y,
        };
        window.addEventListener('mousemove', onDragMove);
        window.addEventListener('mouseup', onDragEnd);
    }, [position]);

    const onDragMove = useCallback((e: MouseEvent) => {
        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;
        setPosition({
            x: dragStartPos.current.panelX + dx,
            y: dragStartPos.current.panelY + dy,
        });
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
                zIndex: 9999, // 确保在顶层
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 8px',
                userSelect: 'none', // 防止拖拽时选中文字
            }}
        >
            {/* 拖拽手柄 */}
            <Box 
                className="think-timer-drag-handle"
                onMouseDown={onDragStart}
            >
                <DragIndicatorIcon sx={{ color: 'text.disabled', cursor: 'move' }} />
            </Box>

            {/* 任务标题 */}
            <Tooltip title={activeTimer ? `点击跳转: ${taskItem?.title}` : "无计时任务"}>
                <a 
                    href={taskItem ? makeObsUri(taskItem) : '#'} 
                    style={{ flexGrow: 1, minWidth: '120px', maxWidth: '300px', textDecoration: 'none', color: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                    <Typography variant="body2" noWrap>
                        {activeTimer ? (taskItem?.title || '加载中...') : '无计时任务'}
                    </Typography>
                </a>
            </Tooltip>

            {/* 时间显示 */}
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: activeTimer ? 'primary.main' : 'text.disabled' }}>
                {displayTime}
            </Typography>

            {/* 控制按钮 */}
            {activeTimer?.status === 'running' ? (
                <Tooltip title="暂停">
                    <IconButton size="small" onClick={pause}><PauseIcon fontSize="inherit" /></IconButton>
                </Tooltip>
            ) : (
                <Tooltip title="继续">
                    <span> {/* disabled按钮需要span包裹才能显示tooltip */}
                        <IconButton size="small" onClick={resume} color="primary" disabled={!activeTimer}><PlayArrowIcon fontSize="inherit" /></IconButton>
                    </span>
                </Tooltip>
            )}
            <Tooltip title="停止并记录">
                 <span>
                    <IconButton size="small" onClick={stop} disabled={!activeTimer}><StopIcon fontSize="inherit" /></IconButton>
                 </span>
            </Tooltip>
            <Tooltip title="编辑任务">
                <span>
                    <IconButton size="small" onClick={handleEdit} disabled={!activeTimer}><EditIcon fontSize="inherit" /></IconButton>
                </span>
            </Tooltip>
        </Paper>
    );
}