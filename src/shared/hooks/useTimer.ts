// src/shared/hooks/useTimer.ts
/** @jsxImportSource preact */
import { useState, useEffect, useMemo, useCallback } from 'preact/hooks';
import { useStore } from '@state/AppStore';
// [修改] 从注册表导入 timerService
import { timerService } from '@state/storeRegistry';
import { formatSecondsToHHMMSS } from '@core/utils/date';
import { Item } from '@core/domain/schema';
// [修改] 从注册表导入 dataStore
import { dataStore } from '@state/storeRegistry';

/**
 * 一个 Preact Hook，用于处理计时器的UI逻辑。
 * 它订阅 AppStore，管理 setInterval，并提供格式化的时间和操作函数。
 */
export const useTimer = () => {
    // 订阅 AppStore 中的 activeTimer 状态
    const activeTimer = useStore(state => state.activeTimer);
    // 使用一个本地 state 来驱动UI每秒刷新
    const [displayTime, setDisplayTime] = useState('00:00:00');
    // [新增] 保存当前计时任务的完整信息
    const [taskItem, setTaskItem] = useState<Item | null>(null);

    useEffect(() => {
        let interval: number | null = null;
        
        // 当 activeTimer 存在时，获取并设置任务信息
        if (activeTimer) {
            // [修复] 从注册表获取 dataStore 实例
            const item = dataStore?.queryItems().find(i => i.id === activeTimer.taskId);
            setTaskItem(item || null);
        } else {
            setTaskItem(null);
        }

        // 管理计时器 interval
        if (activeTimer?.status === 'running') {
            interval = window.setInterval(() => {
                const now = Date.now();
                const currentSessionSeconds = (now - activeTimer.startTime) / 1000;
                const totalSeconds = activeTimer.elapsedSeconds + currentSessionSeconds;
                setDisplayTime(formatSecondsToHHMMSS(totalSeconds));
            }, 1000);
        } else if (activeTimer?.status === 'paused') {
            // 如果是暂停状态，显示已累计的时间
            setDisplayTime(formatSecondsToHHMMSS(activeTimer.elapsedSeconds));
        } else {
            // 没有计时器时，重置显示
            setDisplayTime('00:00:00');
        }

        // Effect 的清理函数：组件卸载或 activeTimer 变化时，清除旧的 interval
        return () => {
            if (interval) {
                window.clearInterval(interval);
            }
        };
    }, [activeTimer]); // 当 activeTimer 对象变化时，重新执行 effect

    // 使用 useCallback 避免不必要地重新创建函数，提高性能
    const actions = useMemo(() => {
        // [修复] 直接使用导入的 timerService 实例
        if (!timerService) return { start: ()=>{}, pause: ()=>{}, resume: ()=>{}, stop: ()=>{} };
        return {
            start: (taskId: string) => timerService.startOrResume(taskId),
            pause: () => activeTimer && timerService.pause(activeTimer.id),
            resume: () => activeTimer && timerService.resume(activeTimer.id),
            stop: () => activeTimer && timerService.stopAndApply(activeTimer.id),
        }
    }, [activeTimer]);

    return {
        activeTimer,
        taskItem, // [新增] 导出当前任务信息
        displayTime,
        ...actions,
    };
};