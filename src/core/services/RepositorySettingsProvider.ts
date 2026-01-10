// src/core/services/RepositorySettingsProvider.ts
/**
 * RepositorySettingsProvider - 基于 SettingsRepository 的设置提供者
 * Role: Adapter (适配器)
 * 
 * 将 SettingsRepository 适配为 ISettingsProvider 接口
 * SettingsProviderToken 的实现
 */

import { singleton, inject } from 'tsyringe';
import type { ThinkSettings } from '@/core/types/schema';
import type { ISettingsProvider } from '@core/services/types';
import { SettingsRepository } from '@core/services/SettingsRepository';

@singleton()
export class RepositorySettingsProvider implements ISettingsProvider {
    constructor(
        @inject(SettingsRepository) private readonly settingsRepository: SettingsRepository
    ) {}

    getSettings(): ThinkSettings {
        return this.settingsRepository.getSettings();
    }
}
