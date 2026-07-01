// src/features/timer/ui/TimerView.tsx
/** @jsxImportSource preact */

import { useSelector } from '@/app/public';
import { selectTimers, selectIsTimerWidgetVisible, selectSetTimerWidgetVisible } from '@/app/public';
import { QuickInputModal, openEditFromItem, openRecordOrigin } from '@/app/public';
import type { ActionService } from '@core/services/public';
import type { Item } from '@core/types/public';
import type { RecordSubmitResult } from '@core/recordInput/public';
import type { TimerService } from '@features/timer/TimerService';
import type { DataStore } from '@core/services/public';
import { TimerViewView } from './TimerViewView';

interface TimerViewProps {
    app: any;
    actionService: ActionService;
    timerService: TimerService;
    dataStore: DataStore;
}

/**
 * Container: 负责 state 订阅与运行时能力桥接；View 只负责渲染。
 * Round3: 容器/视图分离，减少视图组件的 store 依赖。
 * Round14: Obsidian app / QuickInputModal 只停留在容器层。
 */
export function TimerView({ app, actionService, timerService, dataStore }: TimerViewProps) {
    const timers = useSelector(selectTimers);
    const isVisible = useSelector(selectIsTimerWidgetVisible);
    const setTimerWidgetVisible = useSelector(selectSetTimerWidgetVisible);

    const handleOpenRecord = (item: Item) => {
        openEditFromItem({ app, item, openedFrom: 'timer' });
    };

    const handleOpenRecordOrigin = (item: Item) => {
        openRecordOrigin({ app, item });
    };

    const handleCreateNewTask = () => {
        const config = actionService.getQuickInputConfigForNewTimer();
        if (!config) return;

        new QuickInputModal(app, config.blockId, config.context, config.themeId, undefined, false, {
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
            setVisible={setTimerWidgetVisible}
            onOpenRecord={handleOpenRecord}
            onOpenRecordOrigin={handleOpenRecordOrigin}
            onCreateNewTask={handleCreateNewTask}
        />
    );
}
