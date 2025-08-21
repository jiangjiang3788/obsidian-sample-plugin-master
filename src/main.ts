// src/main.ts
import { App, Plugin } from 'obsidian';

import { ObsidianPlatform } from '@platform/obsidian';
import { DataStore } from '@core/services/dataStore';
import { AppStore } from '@state/AppStore';
import { RendererService } from '@core/services/RendererService'; // [新增] 导入新服务

import * as DashboardFeature from '@features/dashboard';
import * as QuickInputFeature from '@features/quick-input';
import * as CoreSettings from '@core/settings/index';

import type { DataSource, ViewInstance, Layout, InputSettings } from '@core/domain/schema';
import { GLOBAL_CSS, STYLE_TAG_ID } from '@core/domain/constants';

// ---------- 插件级类型 & 默认值 ---------- //

export interface ThinkSettings {
    dataSources: DataSource[];
    viewInstances: ViewInstance[];
    layouts: Layout[];
    inputSettings: InputSettings;
}

const DEFAULT_SETTINGS: ThinkSettings = {
    dataSources: [],
    viewInstances: [],
    layouts: [],
    inputSettings: { blocks: [], themes: [], overrides: [] },
};

// ---------- Feature & Core Context ---------- //

export interface ThinkContext {
    app: App;
    plugin: ThinkPlugin;
    platform: ObsidianPlatform;
    dataStore: DataStore;
    appStore: AppStore;
    rendererService: RendererService; // [新增] 将 rendererService 加入上下文
}

// ---------- 主插件类 ---------- //

export default class ThinkPlugin extends Plugin {
    platform!: ObsidianPlatform;
    dataStore!: DataStore;
    appStore!: AppStore;
    rendererService!: RendererService; // [新增] 声明 rendererService

    // [移除] activeLayouts 数组，其职责已移交至 RendererService
    // [移除] persistAll 方法，其职责已移交至 AppStore
    // [移除] rerenderActiveLayouts 方法，其职责已移交至 RendererService

    async onload(): Promise<void> {
        console.log('ThinkPlugin load');

        const settings = await this.loadSettings();

        this.injectGlobalCss();

        // 1. 初始化平台和核心服务
        this.platform = new ObsidianPlatform(this.app);
        this.dataStore = new DataStore(this.platform);
        this.appStore = AppStore.instance;
        this.appStore.init(this, settings);

        // 2. [新增] 初始化渲染服务
        this.rendererService = new RendererService(this, this.dataStore, this.appStore);

        await this.dataStore.initialScan();

        // 3. 构建上下文，传递给所有功能模块
        const ctx: ThinkContext = {
            app: this.app,
            plugin: this,
            platform: this.platform,
            dataStore: this.dataStore,
            appStore: this.appStore,
            rendererService: this.rendererService, // [新增] 传递 rendererService
        };

        // 4. 启动所有功能模块
        DashboardFeature.setup?.(ctx);
        QuickInputFeature.setup?.(ctx);
        CoreSettings.setup?.(ctx);

        this.addCommand({
            id: 'think-open-settings',
            name: '打开 Think 插件设置',
            callback: () => {
                // @ts-ignore
                this.app.setting.open();
                // @ts-ignore
                this.app.setting.openTabById(this.manifest.id);
            }
        });
    }

    onunload(): void {
        console.log('ThinkPlugin unload');
        document.getElementById(STYLE_TAG_ID)?.remove();
        
        // [修改] 调用 rendererService 进行统一清理，不再手动管理
        this.rendererService.cleanup();
    }

    private async loadSettings(): Promise<ThinkSettings> {
        const stored = (await this.loadData()) as Partial<ThinkSettings> | null;
        const merged = Object.assign({}, DEFAULT_SETTINGS, stored);
        merged.dataSources = merged.dataSources || [];
        merged.viewInstances = merged.viewInstances || [];
        merged.layouts = merged.layouts || [];
        merged.inputSettings = merged.inputSettings || { blocks: [], themes: [], overrides: [] };
        return merged;
    }

    // [修改] 此方法现在仅由 AppStore 内部调用，用于代理保存操作
    async saveSettings() {
        // 这个方法现在实际上可以由 AppStore 内部的 `_updateSettingsAndPersist` 触发
        // 我们保留它以防有其他地方需要手动触发保存（尽管最佳实践是通过更新AppStore来完成）
        await this.saveData(this.appStore.getSettings());
    }

    private injectGlobalCss() {
        let el = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
        if (!el) {
            el = document.createElement('style');
            el.id = STYLE_TAG_ID;
            document.head.appendChild(el);
        }
        el.textContent = GLOBAL_CSS;
    }
}