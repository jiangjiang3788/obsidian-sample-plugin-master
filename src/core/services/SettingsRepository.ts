// src/core/services/SettingsRepository.ts
/**
 * SettingsRepository - 设置持久化仓库
 * Role: Repository (数据访问层)
 * 
 * 【S1 可观测性】
 * - 所有写入操作支持可选 ActionMeta 参数
 * - 在 dev 环境输出 [SETTINGS_WRITE] 日志
 * - 包含 actionName + source + diff
 * 
 * Do:
 * - 封装设置的读写 IO 操作
 * - 使用 immer/produce 进行不可变更新
 * - 提供统一的设置访问接口
 * - 在 dev 环境记录写入日志
 * 
 * Don't:
 * - 管理 UI 状态
 * - 处理业务逻辑
 * - 在 production 环境输出日志
 */

import { singleton, inject } from 'tsyringe';
import { produce } from 'immer';
import type { ThinkSettings } from '@/core/types/schema';
import type { ActionMeta } from '@/core/types/actionMeta';
import { logSettingsWrite } from '@/core/utils/devLogger';

// ============== 类型定义 ==============

/**
 * 设置持久化接口
 * 抽象 Obsidian Plugin 的 loadData/saveData
 */
export interface ISettingsPersistence {
    loadData(): Promise<ThinkSettings | null>;
    saveData(settings: ThinkSettings): Promise<void>;
}

export const SETTINGS_PERSISTENCE_TOKEN = 'SettingsPersistence';

// ============== SettingsRepository ==============

@singleton()
export class SettingsRepository {
    private currentSettings: ThinkSettings | null = null;
    private listeners: Set<(settings: ThinkSettings) => void> = new Set();

    constructor(
        @inject(SETTINGS_PERSISTENCE_TOKEN) private persistence: ISettingsPersistence
    ) {}

    /**
     * 订阅设置变化
     * @param listener 变化时调用的回调
     * @returns 取消订阅函数
     */
    subscribe(listener: (settings: ThinkSettings) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * 通知所有订阅者
     */
    private notify(): void {
        if (this.currentSettings) {
            this.listeners.forEach(listener => listener(this.currentSettings!));
        }
    }

    /**
     * 加载设置
     * @returns 当前设置（如果未加载过会从持久化层读取）
     */
    async load(): Promise<ThinkSettings> {
        if (this.currentSettings) {
            return this.currentSettings;
        }

        const loaded = await this.persistence.loadData();
        if (loaded) {
            this.currentSettings = loaded;
            this.notify();
            return loaded;
        }

        // 如果持久化层没有数据，应该由调用方提供默认值
        throw new Error('SettingsRepository: 无法加载设置，请确保已初始化');
    }

    /**
     * 获取当前设置（同步，必须先调用 load）
     */
    getSettings(): ThinkSettings {
        if (!this.currentSettings) {
            throw new Error('SettingsRepository: 设置未加载，请先调用 load()');
        }
        return this.currentSettings;
    }

    /**
     * 获取当前设置快照（getSettings 的别名，符合 S2 规范）
     * @returns 当前设置的不可变快照
     */
    getSnapshot(): ThinkSettings {
        return this.getSettings();
    }

    /**
     * 设置初始值（用于首次加载或重置）
     */
    setInitialSettings(settings: ThinkSettings): void {
        this.currentSettings = settings;
        this.notify();
    }

    /**
     * 保存设置
     * @param settings 新设置
     * @param meta 可选的动作元数据（用于 dev 日志）
     */
    async save(settings: ThinkSettings, meta?: ActionMeta): Promise<void> {
        const before = this.currentSettings;
        this.currentSettings = settings;
        await this.persistence.saveData(settings);
        
        // S1: Dev-only 日志
        logSettingsWrite(meta, before, settings);
    }

    /**
     * 使用 immer 更新设置
     * @param mutator 修改函数，接收 draft 参数进行修改
     * @param meta 可选的动作元数据（用于 dev 日志）
     * @returns 更新后的设置
     */
    async update(mutator: (draft: ThinkSettings) => void, meta?: ActionMeta): Promise<ThinkSettings> {
        if (!this.currentSettings) {
            throw new Error('SettingsRepository: 设置未加载，请先调用 load()');
        }

        const before = this.currentSettings;
        
        // 使用 immer 进行不可变更新
        const newSettings = produce(this.currentSettings, mutator);
        
        // 只有真正发生变化时才保存并通知
        if (newSettings !== this.currentSettings) {
            this.currentSettings = newSettings;
            await this.persistence.saveData(newSettings);
            this.notify();
            
            // S1: Dev-only 日志
            logSettingsWrite(meta, before, newSettings);
        }

        return newSettings;
    }
}
