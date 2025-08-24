// src/main.ts
import { App, Plugin } from 'obsidian';

import { ObsidianPlatform } from '@platform/obsidian';
import { DataStore } from '@core/services/dataStore';
import { AppStore } from '@state/AppStore';
import { RendererService } from '@core/services/RendererService';

import * as DashboardFeature from '@features/dashboard';
import * as QuickInputFeature from '@features/quick-input';
import * as CoreSettings from '@core/settings/index';

// [修改] 导入 Group 和 GroupType
import { ThinkSettings, DEFAULT_SETTINGS, Group, GroupType } from '@core/domain/schema';
import { STYLE_TAG_ID } from '@core/domain/constants';
import { GLOBAL_CSS } from '@features/dashboard/styles/global';

// ... ThinkContext 接口保持不变 ...
export interface ThinkContext {
    app: App;
    plugin: ThinkPlugin;
    platform: ObsidianPlatform;
    dataStore: DataStore;
    appStore: AppStore;
    rendererService: RendererService;
}


export default class ThinkPlugin extends Plugin implements ThinkContext {
    platform!: ObsidianPlatform;
    dataStore!: DataStore;
    appStore!: AppStore;
    rendererService!: RendererService;

    get plugin() {
        return this;
    }

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
        
        // [核心修改] 数据迁移逻辑
        if (!merged.hasOwnProperty('groups')) {
            console.log('ThinkPlugin: 检测到旧版本数据，开始迁移...');
            merged.groups = [];
            const generateId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

            const migrate = (items: any[], type: GroupType) => {
                if (items && items.length > 0) {
                    const defaultGroup: Group = {
                        id: generateId('group'),
                        name: '默认分组',
                        type: type,
                        parentId: null
                    };
                    merged.groups.push(defaultGroup);
                    items.forEach(item => {
                        if (!item.hasOwnProperty('parentId')) {
                            item.parentId = defaultGroup.id;
                        }
                    });
                }
            };
            
            migrate(merged.dataSources, 'dataSource');
            migrate(merged.viewInstances, 'viewInstance');
            migrate(merged.layouts, 'layout');
        }

        // [新增修改] 为没有 collapsed 属性的旧视图实例数据补充默认值 true
        if (merged.viewInstances) {
            merged.viewInstances.forEach(vi => {
                if (vi.collapsed === undefined) {
                    vi.collapsed = true;
                }
            });
        }

        merged.dataSources = merged.dataSources || [];
        merged.viewInstances = merged.viewInstances || [];
        merged.layouts = merged.layouts || [];
        merged.inputSettings = merged.inputSettings || { blocks: [], themes: [], overrides: [] };
        return merged as ThinkSettings;
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