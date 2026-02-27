// src/features/timer/ui/TimerView.tsx
/** @jsxImportSource preact */

import { useSelector } from '@/app/public';
import { selectTimers, selectIsTimerWidgetVisible, selectSetTimerWidgetVisible } from '@/app/public';
import type { ActionService } from '@core/public';
import type { TimerService } from '@features/timer/TimerService';
import type { DataStore } from '@core/public';
import { TimerViewView } from './TimerViewView';

interface TimerViewProps {
    app: any;
    actionService: ActionService;
    timerService: TimerService;
    dataStore: DataStore;
}

/**
 * Container: 负责 state 订阅与 dispatch；View 只负责渲染。
 * Round3: 容器/视图分离，减少视图组件的 store 依赖。
 */
export function TimerView({ app, actionService, timerService, dataStore }: TimerViewProps) {
    const timers = useSelector(selectTimers);
    const isVisible = useSelector(selectIsTimerWidgetVisible);
    const setTimerWidgetVisible = useSelector(selectSetTimerWidgetVisible);

    return (
        <TimerViewView
            app={app}
            actionService={actionService}
            timerService={timerService}
            dataStore={dataStore}
            timers={timers}
            isVisible={isVisible}
            setVisible={setTimerWidgetVisible}
        />
    );
}
