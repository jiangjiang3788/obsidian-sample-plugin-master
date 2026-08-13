// src/features/timer/ui/TimerViewView.tsx
/** @jsxImportSource preact */

import { FloatingPanel } from '@/app/public';
import { AddCircleOutlineIcon, ThinkButton } from '@shared/ui/public';
import { TimerRow } from './TimerRow';
import type { DataStore } from '@core/services/public';
import type { RecordViewItem } from '@core/types/public';
import type { TimerService } from '@features/timer/TimerService';
import type { TimerState } from '@/app/public';

interface TimerViewViewProps {
    timerService: TimerService;
    dataStore: DataStore;
    timers: TimerState[];
    isVisible: boolean;
    setVisible: (v: boolean) => void;
    onOpenRecord: (item: RecordViewItem) => void;
    onOpenRecordOrigin: (item: RecordViewItem) => void;
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
                <ThinkButton size="sm" leadingIcon={<AddCircleOutlineIcon fontSize="small" />} onClick={onCreateNewTask}>
                    新任务
                </ThinkButton>
            }
        >
            <div className="think-timer-list">
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
                    <div className="think-timer-empty-state">暂无计时任务</div>
                )}
            </div>
        </FloatingPanel>
    );
}
