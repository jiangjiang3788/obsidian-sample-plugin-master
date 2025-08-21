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
// [修改] 分开导入，STYLE_TAG_ID 来自 domain, GLOBAL_CSS 来自 feature
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

export default class ThinkPlugin extends Plugin {
    platform!: ObsidianPlatform;
    dataStore!: DataStore;
    appStore!: AppStore;
    rendererService!: RendererService;

    async onload(): Promise<void> {
        console.log('ThinkPlugin load');

        const settings = await this.loadSettings();

        this.injectGlobalCss();

        this.platform = new ObsidianPlatform(this.app);
        this.dataStore = new DataStore(this.platform);
        this.appStore = AppStore.instance;
        this.appStore.init(this, settings);
        this.rendererService = new RendererService(this, this.dataStore, this.appStore);

        await this.dataStore.initialScan();

        const ctx: ThinkContext = {
            app: this.app,
            plugin: this,
            platform: this.platform,
            dataStore: this.dataStore,
            appStore: this.appStore,
            rendererService: this.rendererService,
        };

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
        // [修改] 此处使用的 GLOBAL_CSS 现在是从新位置导入的
        el.textContent = GLOBAL_CSS;
    }
}