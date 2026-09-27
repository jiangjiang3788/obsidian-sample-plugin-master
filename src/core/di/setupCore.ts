import { container } from 'tsyringe';
import { AppToken, SettingsProviderToken } from '@core/services/types';
import { VaultFileStorage, STORAGE_TOKEN } from '@core/services/StorageService';
import { RepositorySettingsProvider } from '@core/services/RepositorySettingsProvider';
import { SettingsRepository } from '@core/services/SettingsRepository';

/**
 * 配置核心 DI 容器
 * 注册基础服务和配置
 *
 * 注意：此文件在 core 层，不应依赖 features 层和 app 层
 *
 * Settings 不再作为启动参数注入；SettingsRepository.load() 是唯一加载入口。
 * @param app Obsidian App 实例（Phase2: core 不依赖 obsidian 类型，因此使用 unknown）
 */
export function setupCoreContainer(app: unknown): void {
    // 注册基础依赖
    container.register(AppToken, { useValue: app });
    container.register(STORAGE_TOKEN, { useClass: VaultFileStorage });

    // SettingsRepository 延迟 resolve：其 SettingsPersistence 由 app composition root 注册。
    container.registerSingleton(SettingsRepository);

    // 注册 RepositorySettingsProvider 单例
    container.registerSingleton(RepositorySettingsProvider);

    // 注册 SettingsProviderToken 映射到 RepositorySettingsProvider
    container.register(SettingsProviderToken, { useToken: RepositorySettingsProvider });
}
