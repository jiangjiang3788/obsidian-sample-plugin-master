// src/store/stores/TimerStore.ts
import { generateId } from '@core/utils/array';

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
 * 
 * 注意：TimerStore是内存存储，不使用Settings持久化
 * 而是通过专门的persistTimers函数进行文件持久化
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
    public setInitialTimers = (timers: TimerState[]): void => {
        this._timers = [...timers]; // 创建副本，避免意外修改
        this._notify();
    }

    // 获取所有计时器
    public getTimers = (): TimerState[] => {
        return [...this._timers]; // 返回副本，防止外部修改
    }

    // 获取单个计时器
    public getTimer = (id: string): TimerState | undefined => {
        return this._timers.find(t => t.id === id);
    }

    // 获取活跃计时器（正在运行的）
    public getActiveTimer = (): TimerState | undefined => {
        return this._timers.find(t => t.status === 'running');
    }

    // 添加计时器 - 优化后的版本
    public addTimer = async (timer: Omit<TimerState, 'id'>): Promise<TimerState> => {
        const newTimer: TimerState = { ...timer, id: generateId('timer') };
        this._timers = [...this._timers, newTimer];
        this._notify();
        await this._persistAndHandleError();
        return newTimer;
    }

    // 更新计时器 - 优化后的版本  
    public updateTimer = async (updatedTimer: TimerState): Promise<boolean> => {
        const index = this._timers.findIndex(t => t.id === updatedTimer.id);
        if (index === -1) {
            console.warn(`找不到ID为 ${updatedTimer.id} 的计时器`);
            return false;
        }

        const newTimers = [...this._timers];
        newTimers[index] = { ...updatedTimer }; // 创建副本
        this._timers = newTimers;
        this._notify();
        await this._persistAndHandleError();
        return true;
    }

    // 移除计时器 - 优化后的版本
    public removeTimer = async (timerId: string): Promise<boolean> => {
        const initialLength = this._timers.length;
        this._timers = this._timers.filter(t => t.id !== timerId);
        
        if (this._timers.length === initialLength) {
            console.warn(`找不到ID为 ${timerId} 的计时器`);
            return false;
        }

        this._notify();
        await this._persistAndHandleError();
        return true;
    }

    // 启动计时器
    public startTimer = async (timerId: string): Promise<boolean> => {
        const timer = this._timers.find(t => t.id === timerId);
        if (!timer) {
            console.warn(`找不到ID为 ${timerId} 的计时器`);
            return false;
        }
        
        if (timer.status !== 'paused') {
            console.warn(`计时器 ${timerId} 当前状态为 ${timer.status}，无法启动`);
            return false;
        }

        return await this.updateTimer({
            ...timer,
            status: 'running',
            startTime: Date.now()
        });
    }

    // 暂停计时器
    public pauseTimer = async (timerId: string): Promise<boolean> => {
        const timer = this._timers.find(t => t.id === timerId);
        if (!timer) {
            console.warn(`找不到ID为 ${timerId} 的计时器`);
            return false;
        }
        
        if (timer.status !== 'running') {
            console.warn(`计时器 ${timerId} 当前状态为 ${timer.status}，无法暂停`);
            return false;
        }

        // 计算已用时间
        const currentElapsed = timer.elapsedSeconds + Math.floor((Date.now() - timer.startTime) / 1000);
        
        return await this.updateTimer({
            ...timer,
            status: 'paused',
            elapsedSeconds: currentElapsed
        });
    }

    // 重置计时器
    public resetTimer = async (timerId: string): Promise<boolean> => {
        const timer = this._timers.find(t => t.id === timerId);
        if (!timer) {
            console.warn(`找不到ID为 ${timerId} 的计时器`);
            return false;
        }

        return await this.updateTimer({
            ...timer,
            elapsedSeconds: 0,
            status: 'paused',
            startTime: Date.now() // 重置开始时间
        });
    }

    // 批量移除计时器
    public batchRemoveTimers = async (timerIds: string[]): Promise<number> => {
        const initialLength = this._timers.length;
        this._timers = this._timers.filter(t => !timerIds.includes(t.id));
        const removedCount = initialLength - this._timers.length;
        
        if (removedCount > 0) {
            this._notify();
            await this._persistAndHandleError();
        }
        
        return removedCount;
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
    public stopAllRunningTimers = async (): Promise<number> => {
        const runningTimers = this.getRunningTimers();
        let stoppedCount = 0;
        
        for (const timer of runningTimers) {
            const success = await this.pauseTimer(timer.id);
            if (success) stoppedCount++;
        }
        
        return stoppedCount;
    }

    // 清空所有计时器
    public clearAllTimers = async (): Promise<void> => {
        this._timers = [];
        this._notify();
        await this._persistAndHandleError();
    }

    // 新增：检查计时器是否存在
    public timerExists = (id: string): boolean => {
        return this._timers.some(t => t.id === id);
    }

    // 新增：获取计时器数量
    public getTimerCount = (): number => {
        return this._timers.length;
    }

    // 新增：获取特定状态的计时器数量
    public getTimerCountByStatus = (status: 'running' | 'paused'): number => {
        return this._timers.filter(t => t.status === status).length;
    }

    // 新增：获取任务相关的计时器数量
    public getTaskTimerCount = (taskId: string): number => {
        return this._timers.filter(t => t.taskId === taskId).length;
    }

    // 新增：获取当前计时器的总运行时间（秒）
    public getTotalElapsedTime = (): number => {
        const now = Date.now();
        return this._timers.reduce((total, timer) => {
            if (timer.status === 'running') {
                return total + timer.elapsedSeconds + Math.floor((now - timer.startTime) / 1000);
            }
            return total + timer.elapsedSeconds;
        }, 0);
    }

    // 私有方法：统一的持久化和错误处理
    private async _persistAndHandleError(): Promise<void> {
        try {
            await this._persistTimers?.(this._timers);
        } catch (error) {
            console.error('TimerStore: 持久化失败', error);
            // 不重新抛出错误，让应用继续运行
        }
    }
}
