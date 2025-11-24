import { container } from 'tsyringe';
import { App } from 'obsidian';
import { AppStore } from '@/app/AppStore';
import { ThinkSettings } from '@core/types';
import { AppToken, SETTINGS_TOKEN, SettingsProviderToken } from '@core/services/types';
import { VaultFileStorage, STORAGE_TOKEN } from '@core/services/StorageService';

/**
 * 配置核心 DI 容器
 * 注册基础服务和配置
 * 
 * @param app Obsidian App 实例
 * @param settings 插件设置
 */
export function setupCoreContainer(app: App, settings: ThinkSettings): void {
    // 注册基础依赖
    container.register(AppToken, { useValue: app });
    container.register(SETTINGS_TOKEN, { useValue: settings });
    container.register(STORAGE_TOKEN, { useClass: VaultFileStorage });
    
    // 注册单例服务
    container.registerSingleton(AppStore);
    
    // 注册 SettingsProviderToken 映射到 AppStore
    // 这样其他服务可以通过 SettingsProviderToken 获取设置，而不需要直接依赖 AppStore
    container.register(SettingsProviderToken, { useToken: AppStore });
}
