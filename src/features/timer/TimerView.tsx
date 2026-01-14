// src/features/timer/ui/TimerView.tsx
/** @jsxImportSource preact */

import { useZustandAppStore } from '@/app/public';
import FloatingPanel from '@/shared/ui/primitives/FloatingPanel';
import { Button, Stack, Tooltip, Typography } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import type { ActionService } from '@core/services/ActionService';
import type { TimerService } from '@features/timer/TimerService';
import type { DataStore } from '@core/services/DataStore';
import { TimerRow } from './TimerRow';
import { App } from 'obsidian';
import { QuickInputModal, QuickInputSaveData } from '@/features/quickinput/QuickInputModal';

interface TimerViewProps {
    app: App;
    actionService: ActionService;
    timerService: TimerService;
    dataStore: DataStore;
}

export function TimerView({ app, actionService, timerService, dataStore }: TimerViewProps) {
    const timers = useZustandAppStore((state) => state.timer.timers);
    const isVisible = useZustandAppStore((state) => state.ui.isTimerWidgetVisible);
    const setTimerWidgetVisible = useZustandAppStore((state) => state.ui.setTimerWidgetVisible);

    const handleNewTask = () => {
        const config = actionService.getQuickInputConfigForNewTimer();
        if (!config) return;

        const onSaveCallback = (data: QuickInputSaveData) => {
            timerService.createNewTaskAndStart(data);
        };

        new QuickInputModal(app, config.blockId, config.context, undefined, onSaveCallback).open();
    };

    return (
        <FloatingPanel
            id="floating-timer"
            title="任务计时器"
            defaultPosition={{ x: window.innerWidth - 350, y: 100 }}
            minWidth={320}
            maxWidth="90vw"
            bodyPadding={0}
            visible={isVisible}
            // 计时器：通过“显示/隐藏”控制，而不是点击外部关闭
            closeOnOutsideClick={false}
            onClose={() => setTimerWidgetVisible(false)}
            headerActions={
                <Tooltip title="开始新任务">
                    <Button size="small" startIcon={<AddCircleOutlineIcon />} onClick={handleNewTask}>
                        新任务
                    </Button>
                </Tooltip>
            }
        >
            <Stack spacing={1} sx={{ p: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                {timers.length > 0 ? (
                    timers.map((timer) => (
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
        </FloatingPanel>
    );
}
