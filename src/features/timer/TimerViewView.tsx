// src/features/timer/ui/TimerViewView.tsx
/** @jsxImportSource preact */

import { FloatingPanel } from '@/app/public';
import { AddCircleOutlineIcon, Button, Stack, Tooltip } from '@shared/public';
import { TimerRow } from './TimerRow';
import type { DataStore, Item } from '@core/public';
import type { TimerService } from '@features/timer/TimerService';
import type { TimerState } from '@/app/public';

interface TimerViewViewProps {
    timerService: TimerService;
    dataStore: DataStore;
    timers: TimerState[];
    isVisible: boolean;
    setVisible: (v: boolean) => void;
    onOpenRecord: (item: Item) => void;
    onOpenRecordOrigin: (item: Item) => void;
    onCreateNewTask: () => void;
}

export function TimerViewView({
    timerService,
    dataStore,
    timers,
    isVisible,
    setVisible,
    onOpenRecord,
    onOpenRecordOrigin,
    onCreateNewTask,
}: TimerViewViewProps) {
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
                    <Button size="small" startIcon={<AddCircleOutlineIcon />} onClick={onCreateNewTask}>
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
                            dataStore={dataStore}
                            onOpenRecord={onOpenRecord}
                            onOpenRecordOrigin={onOpenRecordOrigin}
                        />
                    ))
                ) : (
                    <div class="empty-state">暂无计时任务</div>
                )}
            </Stack>
        </FloatingPanel>
    );
}
