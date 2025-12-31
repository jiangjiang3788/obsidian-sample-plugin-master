// src/core/services/SettingsRepository.ts
/**
 * SettingsRepository - 设置持久化仓库
 * Role: Repository (数据访问层)
 * 
 * Do:
 * - 封装设置的读写 IO 操作
 * - 使用 immer/produce 进行不可变更新
 * - 提供统一的设置访问接口
 * 
 * Don't:
 * - 管理 UI 状态
 * - 处理业务逻辑
 */

import { singleton, inject } from 'tsyringe';
import { produce } from 'immer';
import type { ThinkSettings } from '@/core/types/schema';

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

    constructor(
        @inject(SETTINGS_PERSISTENCE_TOKEN) private persistence: ISettingsPersistence
    ) {}

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
     * 设置初始值（用于首次加载或重置）
     */
    setInitialSettings(settings: ThinkSettings): void {
        this.currentSettings = settings;
    }

    /**
     * 保存设置
     */
    async save(settings: ThinkSettings): Promise<void> {
        this.currentSettings = settings;
        await this.persistence.saveData(settings);
    }

    /**
     * 使用 immer 更新设置
     * @param mutator 修改函数，接收 draft 参数进行修改
     * @returns 更新后的设置
     */
    async update(mutator: (draft: ThinkSettings) => void): Promise<ThinkSettings> {
        if (!this.currentSettings) {
            throw new Error('SettingsRepository: 设置未加载，请先调用 load()');
        }

        // 使用 immer 进行不可变更新
        const newSettings = produce(this.currentSettings, mutator);
        
        // 只有真正发生变化时才保存
        if (newSettings !== this.currentSettings) {
            this.currentSettings = newSettings;
            await this.persistence.saveData(newSettings);
        }

        return newSettings;
    }
}
