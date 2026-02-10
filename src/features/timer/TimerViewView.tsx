// src/features/timer/ui/TimerViewView.tsx
/** @jsxImportSource preact */

import { FloatingPanel, QuickInputModal } from '@/app/public';
import { Button, Stack, Tooltip } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { TimerRow } from './TimerRow';
import type { ActionService, DataStore, QuickInputSaveData } from '@core/public';
import type { TimerService } from '@features/timer/TimerService';
import type { TimerState } from '@/app/public';

interface TimerViewViewProps {
    app: any;
    actionService: ActionService;
    timerService: TimerService;
    dataStore: DataStore;
    timers: TimerState[];
    isVisible: boolean;
    setVisible: (v: boolean) => void;
}

export function TimerViewView({ app, actionService, timerService, dataStore, timers, isVisible, setVisible }: TimerViewViewProps) {
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
            closeOnOutsideClick={false}
            onClose={() => setVisible(false)}
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
                            timerService={timerService}
                            actionService={actionService}
                            dataStore={dataStore}
                            app={app}
                        />
                    ))
                ) : (
                    <div class="empty-state">暂无计时任务</div>
                )}
            </Stack>
        </FloatingPanel>
    );
}
