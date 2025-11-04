// src/store/stores/TimerStore.ts
import { generateId } from '../../lib/utils/core/array';

export interface TimerState {
    id: string;
    taskId: string;
    startTime: number;
    elapsedSeconds: number;
    status: 'running' | 'paused';
}

/**
 * TimerStore - 管理计时器状态
 * 负责计时器的增删改查和状态管理
 */
export class TimerStore {
    private _timers: TimerState[] = [];
    private _persistTimers?: (timers: TimerState[]) => Promise<void>;
    private _notify: () => void;

    constructor(
        notify: () => void,
        persistTimers?: (timers: TimerState[]) => Promise<void>
    ) {
        this._notify = notify;
        this._persistTimers = persistTimers;
    }

    // 设置初始计时器（从文件加载）
    public setInitialTimers = (timers: TimerState[]) => {
        this._timers = timers;
        this._notify();
    }

    // 获取所有计时器
    public getTimers = (): TimerState[] => {
        return this._timers;
    }

    // 获取单个计时器
    public getTimer = (id: string): TimerState | undefined => {
        return this._timers.find(t => t.id === id);
    }

    // 获取活跃计时器（正在运行的）
    public getActiveTimer = (): TimerState | undefined => {
        return this._timers.find(t => t.status === 'running');
    }

    // 添加计时器
    public addTimer = async (timer: Omit<TimerState, 'id'>) => {
        const newTimer: TimerState = { ...timer, id: generateId('timer') };
        this._timers = [...this._timers, newTimer];
        this._notify();
        await this._persistTimers?.(this._timers);
        return newTimer;
    }

    // 更新计时器
    public updateTimer = async (updatedTimer: TimerState) => {
        const index = this._timers.findIndex(t => t.id === updatedTimer.id);
        if (index !== -1) {
            const newTimers = [...this._timers];
            newTimers[index] = updatedTimer;
            this._timers = newTimers;
            this._notify();
            await this._persistTimers?.(this._timers);
        }
    }

    // 移除计时器
    public removeTimer = async (timerId: string) => {
        this._timers = this._timers.filter(t => t.id !== timerId);
        this._notify();
        await this._persistTimers?.(this._timers);
    }

    // 启动计时器
    public startTimer = async (timerId: string) => {
        const timer = this._timers.find(t => t.id === timerId);
        if (timer && timer.status === 'paused') {
            await this.updateTimer({
                ...timer,
                status: 'running',
                startTime: Date.now()
            });
        }
    }

    // 暂停计时器
    public pauseTimer = async (timerId: string) => {
        const timer = this._timers.find(t => t.id === timerId);
        if (timer && timer.status === 'running') {
            await this.updateTimer({
                ...timer,
                status: 'paused'
            });
        }
    }

    // 重置计时器
    public resetTimer = async (timerId: string) => {
        const timer = this._timers.find(t => t.id === timerId);
        if (timer) {
            await this.updateTimer({
                ...timer,
                elapsedSeconds: 0,
                status: 'paused'
            });
        }
    }

    // 批量移除计时器
    public batchRemoveTimers = async (timerIds: string[]) => {
        this._timers = this._timers.filter(t => !timerIds.includes(t.id));
        this._notify();
        await this._persistTimers?.(this._timers);
    }

    // 获取特定任务的计时器
    public getTimersByTask = (taskId: string): TimerState[] => {
        return this._timers.filter(t => t.taskId === taskId);
    }

    // 获取正在运行的计时器列表
    public getRunningTimers = (): TimerState[] => {
        return this._timers.filter(t => t.status === 'running');
    }

    // 获取暂停的计时器列表
    public getPausedTimers = (): TimerState[] => {
        return this._timers.filter(t => t.status === 'paused');
    }

    // 停止所有正在运行的计时器
    public stopAllRunningTimers = async () => {
        const runningTimers = this.getRunningTimers();
        for (const timer of runningTimers) {
            await this.pauseTimer(timer.id);
        }
    }

    // 清空所有计时器
    public clearAllTimers = async () => {
        this._timers = [];
        this._notify();
        await this._persistTimers?.(this._timers);
    }
}
