// src/main.ts
import { App, Plugin } from 'obsidian';

import { ObsidianPlatform } from '@platform/obsidian';
import { DataStore } from '@core/services/dataStore';
import { AppStore } from '@state/AppStore';
import { RendererService } from '@core/services/RendererService';

import * as DashboardFeature from '@features/dashboard';
import * as QuickInputFeature from '@features/quick-input';
import * as CoreSettings from '@core/settings/index';

import { ThinkSettings, DEFAULT_SETTINGS } from '@core/domain/schema';
import { STYLE_TAG_ID } from '@core/domain/constants';
import { GLOBAL_CSS } from '@features/dashboard/styles/global';

// ---------- Feature & Core Context ---------- //

export interface ThinkContext {
    app: App;
    plugin: ThinkPlugin;
    platform: ObsidianPlatform;
    dataStore: DataStore;
    appStore: AppStore;
    rendererService: RendererService;
}

// ---------- 主插件类 ---------- //

// [重构] 让插件类直接实现上下文接口, 自身实例即为 Context
export default class ThinkPlugin extends Plugin implements ThinkContext {
    // ThinkContext 接口要求的属性
    platform!: ObsidianPlatform;
    dataStore!: DataStore;
    appStore!: AppStore;
    rendererService!: RendererService;

    // `plugin` 属性通过 getter 实现，返回自身实例
    get plugin() {
        return this;
    }
    // `app` 属性由 Plugin 基类提供，天然满足接口要求

    async onload(): Promise<void> {
        console.log('ThinkPlugin load');

        const settings = await this.loadSettings();

        this.injectGlobalCss();

        // 初始化所有服务并挂载到 this 上
        this.platform = new ObsidianPlatform(this.app);
        this.dataStore = new DataStore(this.platform);
        this.appStore = AppStore.instance;
        this.appStore.init(this, settings);
        this.rendererService = new RendererService(this, this.dataStore, this.appStore);

        await this.dataStore.initialScan();

        // [重构] 不再需要创建临时的 ctx 对象, 直接将 this (插件实例) 作为上下文传递
        DashboardFeature.setup?.(this);
        QuickInputFeature.setup?.(this);
        CoreSettings.setup?.(this);

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

    async saveSettings() {
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