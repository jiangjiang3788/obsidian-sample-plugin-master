// src/core/VaultWatcher.ts
import { Plugin, TFile } from 'obsidian';
import { DataStore } from '../services/core/dataStore';

/** 监听 Vault 变化并与 DataStore 联动（节流由 DataStore 内部处理） */
export class VaultWatcher {
    private plugin: Plugin;
    private dataStore: DataStore;

    constructor(plugin: Plugin, dataStore: DataStore) {
        this.plugin = plugin;
        this.dataStore = dataStore;
        this.registerEvents();
    }

    /**
     * [重构] 定义一个可复用的文件变更处理函数
     * @param f - 被创建、修改或重命名的文件
     */
    private handleFileChange = (f: TFile): void => {
        // 确保是 Markdown 文件，然后执行扫描并通知更新
        if (f instanceof TFile && f.extension === 'md') {
            this.dataStore.scanFile(f).then(() => this.dataStore.notifyChange());
        }
    };

    private registerEvents() {
        const { vault } = this.plugin.app;

        // [重构] 'create' 和 'modify' 事件现在共用同一个处理函数，遵循DRY原则
        this.plugin.registerEvent(vault.on('modify', this.handleFileChange));
        this.plugin.registerEvent(vault.on('create', this.handleFileChange));

        this.plugin.registerEvent(vault.on('delete', f => {
            if (f instanceof TFile && f.extension === 'md') {
                this.dataStore.removeFileItems(f.path);
                this.dataStore.notifyChange();
            }
        }));

        this.plugin.registerEvent(vault.on('rename', (f, old) => {
            if (f instanceof TFile && f.extension === 'md') {
                this.dataStore.removeFileItems(old);
                // [重构] 重命名操作中的“重新扫描新文件”部分也复用了 handleFileChange
                this.handleFileChange(f);
            }
        }));
    }
}