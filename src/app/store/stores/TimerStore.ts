// src/app/store/stores/TimerStore.ts
/**
 * Timer Store - 管理计时器状态
 * 
 * 注意：这是新的独立 Store，暂时不影响 AppStore
 * 稍后会逐步将 AppStore 的计时器相关方法迁移到这里
 */

import { CRUDStore } from '@/lib/patterns/CRUDStore';

export interface TimerState {
    id: string;
    taskId: string;
    startTime: number;
    elapsedSeconds: number;
    status: 'running' | 'paused';
}

export class TimerStore extends CRUDStore<TimerState> {
    private persistCallback?: (timers: TimerState[]) => Promise<void>;

    constructor(initialTimers: TimerState[] = []) {
        super();
        this.items = initialTimers;
    }

    /**
     * 设置持久化回调
     * 这个回调将由 AppStore 或 Plugin 提供
     */
    public setPersistCallback(callback: (timers: TimerState[]) => Promise<void>): void {
        this.persistCallback = callback;
    }

    // ===== CRUDStore 实现 =====
    
    protected getIdPrefix(): string {
        return 'timer';
    }

    protected validateItem(item: TimerState): boolean {
        // 验证计时器状态
        return (
            !!item.taskId &&
            typeof item.startTime === 'number' &&
            typeof item.elapsedSeconds === 'number' &&
            (item.status === 'running' || item.status === 'paused')
        );
    }

    protected async persist(): Promise<void> {
        if (this.persistCallback) {
            await this.persistCallback(this.items);
        }
    }

    // ===== Timer 特定方法 =====

    /**
     * 获取所有计时器
     */
    public getTimers(): TimerState[] {
        return this.getAll();
    }

    /**
     * 根据任务ID获取计时器
     */
    public getTimerByTaskId(taskId: string): TimerState | undefined {
        return this.find(timer => timer.taskId === taskId);
    }

    /**
     * 获取正在运行的计时器
     */
    public getRunningTimers(): TimerState[] {
        return this.filter(timer => timer.status === 'running');
    }

    /**
     * 获取活动计时器（第一个运行中的计时器）
     */
    public getActiveTimer(): TimerState | undefined {
        return this.find(timer => timer.status === 'running');
    }

    /**
     * 获取暂停的计时器
     */
    public getPausedTimers(): TimerState[] {
        return this.filter(timer => timer.status === 'paused');
    }

    /**
     * 添加计时器
     */
    public async addTimer(timer: Omit<TimerState, 'id'>): Promise<TimerState> {
        return this.add(timer);
    }

    /**
     * 更新计时器
     */
    public async updateTimer(id: string, updates: Partial<TimerState>): Promise<void> {
        return this.update(id, updates);
    }

    /**
     * 删除计时器
     */
    public async deleteTimer(id: string): Promise<void> {
        return this.delete(id);
    }

    /**
     * 启动计时器
     */
    public async startTimer(id: string): Promise<void> {
        const timer = this.getById(id);
        if (!timer) {
            throw new Error(`Timer not found: ${id}`);
        }

        await this.update(id, {
            status: 'running',
            startTime: Date.now() - (timer.elapsedSeconds * 1000)
        });
    }

    /**
     * 暂停计时器
     */
    public async pauseTimer(id: string): Promise<void> {
        const timer = this.getById(id);
        if (!timer) {
            throw new Error(`Timer not found: ${id}`);
        }

        if (timer.status === 'running') {
            const elapsedSeconds = Math.floor((Date.now() - timer.startTime) / 1000);
            await this.update(id, {
                status: 'paused',
                elapsedSeconds
            });
        }
    }

    /**
     * 重置计时器
     */
    public async resetTimer(id: string): Promise<void> {
        await this.update(id, {
            elapsedSeconds: 0,
            startTime: Date.now(),
            status: 'paused'
        });
    }

    /**
     * 停止所有计时器
     */
    public async stopAllTimers(): Promise<void> {
        const runningTimers = this.getRunningTimers();
        for (const timer of runningTimers) {
            await this.pauseTimer(timer.id);
        }
    }

    /**
     * 获取计时器的当前经过时间（秒）
     */
    public getTimerElapsed(id: string): number {
        const timer = this.getById(id);
        if (!timer) {
            return 0;
        }

        if (timer.status === 'running') {
            return Math.floor((Date.now() - timer.startTime) / 1000);
        }
        
        return timer.elapsedSeconds;
    }

    /**
     * 清理已完成的计时器（经过时间超过阈值）
     */
    public async cleanupOldTimers(maxAgeSeconds: number = 86400): Promise<void> {
        const timersToDelete = this.items.filter(timer => {
            const elapsed = this.getTimerElapsed(timer.id);
            return timer.status === 'paused' && elapsed > maxAgeSeconds;
        });

        if (timersToDelete.length > 0) {
            await this.batchDelete(timersToDelete.map(t => t.id));
        }
    }

    /**
     * 检查是否有正在运行的计时器
     */
    public hasRunningTimer(): boolean {
        return this.getRunningTimers().length > 0;
    }

    /**
     * 获取总计时器数量
     */
    public getTimerCount(): number {
        return this.count();
    }

    /**
     * 按任务ID删除计时器
     */
    public async deleteTimerByTaskId(taskId: string): Promise<void> {
        const timer = this.getTimerByTaskId(taskId);
        if (timer) {
            await this.delete(timer.id);
        }
    }
}
