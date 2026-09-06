/** @jsxImportSource preact */
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { QuickInputModal, openEditFromItem, openRecordOrigin, selectTimers, selectIsTimerWidgetVisible, selectSetTimerWidgetVisible, useSelector } from '@/app/public';
import type { ActionService } from '@core/services/public';
import type { RecordViewItem } from '@core/types/public';
import type { RecordSubmitResult } from '@core/recordInput/public';
import type { TimerEnergyCaptureRequest, TimerService } from '@features/timer/TimerService';
import type { DataStore } from '@core/services/public';
import { TimerViewView } from './TimerViewView';
interface TimerViewProps {
    app: any;
    actionService: ActionService;
    timerService: TimerService;
    dataStore: DataStore;
}
export function TimerView({ app, actionService, timerService, dataStore }: TimerViewProps) {
    const timers = useSelector(selectTimers);
    const isVisible = useSelector(selectIsTimerWidgetVisible);
    const setTimerWidgetVisible = useSelector(selectSetTimerWidgetVisible);
    const [energyCaptureRequest, setEnergyCaptureRequest] = useState<TimerEnergyCaptureRequest | null>(null);
    const energyCaptureResolver = useRef<((score: number | null) => void) | null>(null);
    const resolveEnergyCapture = useCallback((score: number | null) => {
        const resolver = energyCaptureResolver.current;
        energyCaptureResolver.current = null;
        setEnergyCaptureRequest(null);
        resolver?.(score);
    }, []);
    useEffect(() => timerService.setEnergyCaptureHandler((request) => new Promise<number | null>((resolve) => {
        energyCaptureResolver.current?.(null);
        energyCaptureResolver.current = resolve;
        setEnergyCaptureRequest(request);
        setTimerWidgetVisible(true);
    })), [timerService, setTimerWidgetVisible]);
    useEffect(() => () => {
        energyCaptureResolver.current?.(null);
        energyCaptureResolver.current = null;
    }, []);
    useEffect(() => {
        if (!energyCaptureRequest || energyCaptureRequest.phase !== 'start') return;
        if (timers.some((timer) => timer.id === energyCaptureRequest.timerId)) return;
        // A stale start prompt must disappear when its Timer is removed. End prompts are
        // intentionally allowed to outlive Timer removal because task completion commits
        // the final TaskSession first and only then asks for the optional after-Energy sample.
        resolveEnergyCapture(null);
    }, [energyCaptureRequest, resolveEnergyCapture, timers]);

    const handleOpenRecord = (item: RecordViewItem) => openEditFromItem({ app, item, openedFrom: 'timer' });
    const handleOpenRecordOrigin = (item: RecordViewItem) => openRecordOrigin({ app, item });
    const handleCreateNewTask = () => {
        const config = actionService.getQuickInputConfigForNewTimer();
        if (!config) return;
        new QuickInputModal(app, config.blockId, config.context, undefined, false, {
            mode: 'create',
            source: 'timer',
            onSubmitSuccess: async (result: RecordSubmitResult) => {
                await timerService.startCreatedTaskIfPossible(result);
            },
        }).open();
    };

    return (
        <TimerViewView
            timerService={timerService}
            dataStore={dataStore}
            timers={timers}
            isVisible={isVisible}
            onOpenRecord={handleOpenRecord}
            onOpenRecordOrigin={handleOpenRecordOrigin}
            onCreateNewTask={handleCreateNewTask}
            energyCaptureRequest={energyCaptureRequest}
            onEnergyCapture={(score) => resolveEnergyCapture(score)}
            onSkipEnergyCapture={() => resolveEnergyCapture(null)}
            onClose={() => {
                if (energyCaptureRequest) resolveEnergyCapture(null);
                setTimerWidgetVisible(false);
            }}
        />
    );
}
