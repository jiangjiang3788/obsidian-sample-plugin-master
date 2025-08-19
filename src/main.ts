// src/main.ts
import { App, Plugin, Notice } from 'obsidian';
import { render, h } from 'preact';

import { ObsidianPlatform } from '@platform/obsidian';
import { DataStore } from '@core/services/dataStore';
import { AppStore } from '@state/AppStore';

import * as DashboardFeature from '@features/dashboard';
import * as QuickInputFeature from '@features/quick-input';
import * as CoreSettings from '@core/settings/index';

// [MOD] 导入新的设置类型
import type { DataSource, ViewInstance, Layout, InputSettings } from '@core/domain/schema';
import { GLOBAL_CSS, STYLE_TAG_ID } from '@core/domain/constants';
import { LayoutRenderer } from '@features/dashboard/ui/LayoutRenderer';

// ---------- 插件级类型 & 默认值 ---------- //

export interface ThinkSettings {
    dataSources: DataSource[];
    viewInstances: ViewInstance[];
    layouts: Layout[];
    // [MOD] 使用新的 InputSettings 结构
    inputSettings: InputSettings;
}

const DEFAULT_SETTINGS: ThinkSettings = {
    dataSources: [],
    viewInstances: [],
    layouts: [],
    // [MOD] 新的默认值
    inputSettings: { blocks: [], themes: [], overrides: [] },
};

// ---------- Feature & Core Context ---------- //

export interface ThinkContext {
    app: App;
    plugin: ThinkPlugin;
    platform: ObsidianPlatform;
    dataStore: DataStore;
    appStore: AppStore;
}

// ---------- 主插件类 ---------- //

export default class ThinkPlugin extends Plugin {
    platform!: ObsidianPlatform;
    dataStore!: DataStore;
    appStore!: AppStore;

    activeLayouts: { container: HTMLElement; layoutName: string }[] = [];

    async persistAll(settings: ThinkSettings) {
        await this.saveData(settings);
        this.rerenderActiveLayouts(settings);
    }

    private rerenderActiveLayouts(settings: ThinkSettings) {
        console.log('[ThinkPlugin] Rerendering active layouts...');
        this.activeLayouts.forEach(activeLayout => {
            const { container, layoutName } = activeLayout;
            const newLayoutConfig = settings.layouts.find(l => l.name === layoutName);

            if (newLayoutConfig) {
                render(h(LayoutRenderer, {
                    layout: newLayoutConfig,
                    dataStore: this.dataStore,
                    plugin: this,
                }), container);
            } else {
                try { render(null, container); } catch { }
                container.empty();
                container.createDiv({ text: `布局配置 "${layoutName}" 已被删除。` });
            }
        });

        this.activeLayouts = this.activeLayouts.filter(al =>
            settings.layouts.some(l => l.name === al.layoutName)
        );
    }

    async onload(): Promise<void> {
        console.log('ThinkPlugin load');

        const settings = await this.loadSettings();

        this.injectGlobalCss();

        this.platform = new ObsidianPlatform(this.app);
        this.dataStore = new DataStore(this.platform);

        this.appStore = AppStore.instance;
        this.appStore.init(this, settings);

        await this.dataStore.initialScan();

        const ctx: ThinkContext = {
            app: this.app,
            plugin: this,
            platform: this.platform,
            dataStore: this.dataStore,
            appStore: this.appStore,
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
        this.activeLayouts.forEach(({ container }) => {
            try { render(null, container); } catch { }
            container.empty();
        });
        this.activeLayouts = [];
    }

    private async loadSettings(): Promise<ThinkSettings> {
        const stored = (await this.loadData()) as Partial<ThinkSettings> | null;
        const merged = Object.assign({}, DEFAULT_SETTINGS, stored);
        merged.dataSources = merged.dataSources || [];
        merged.viewInstances = merged.viewInstances || [];
        merged.layouts = merged.layouts || [];
        // [MOD] 确保新的 inputSettings 结构存在
        merged.inputSettings = merged.inputSettings || { blocks: [], themes: [], overrides: [] };
        return merged;
    }

    async saveSettings() {
        await this.persistAll(this.appStore.getSettings());
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