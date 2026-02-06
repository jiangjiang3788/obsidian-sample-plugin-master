import { container } from 'tsyringe';
import { ThinkSettings } from '@core/types';
import { AppToken, SETTINGS_TOKEN, SettingsProviderToken } from '@core/services/types';
import { VaultFileStorage, STORAGE_TOKEN } from '@core/services/StorageService';
import { RepositorySettingsProvider } from '@core/services/RepositorySettingsProvider';
import { SettingsRepository } from '@core/services/SettingsRepository';

/**
 * 配置核心 DI 容器
 * 注册基础服务和配置
 * 
 * 注意：此文件在 core 层，不应依赖 features 层和 app 层
 * THEME_MATCHER_TOKEN 的注册在 ServiceManager 中完成
 * 
 * @param app Obsidian App 实例（Phase2: core 不依赖 obsidian 类型，因此使用 unknown）
 * @param settings 插件设置
 */
export function setupCoreContainer(app: unknown, settings: ThinkSettings): void {
    // 注册基础依赖
    container.register(AppToken, { useValue: app });
    container.register(SETTINGS_TOKEN, { useValue: settings });
    container.register(STORAGE_TOKEN, { useClass: VaultFileStorage });
    
    // DI DEBUG: SettingsRepository 单例注册（延迟 resolve，不在此处 resolve）
    // 因为 SETTINGS_PERSISTENCE_TOKEN 需要在 ServiceManager.registerSettingsPersistence() 中注册
    // 如果在此处 resolve 会导致 "Attempted to resolve unregistered dependency token: SettingsPersistence"
    container.registerSingleton(SettingsRepository);
    
    // DI FIX: 不在此处 resolve SettingsRepository，改为通过 factory 延迟初始化
    // 使用 SETTINGS_TOKEN 存储初始 settings，SettingsRepository 会在首次 resolve 时自动获取
    // 注意：此时 SETTINGS_TOKEN 已经注册了 settings 值，SettingsRepository 可以从中读取
    
    // 注册 RepositorySettingsProvider 单例
    container.registerSingleton(RepositorySettingsProvider);
    
    // 注册 SettingsProviderToken 映射到 RepositorySettingsProvider
    container.register(SettingsProviderToken, { useToken: RepositorySettingsProvider });
}
