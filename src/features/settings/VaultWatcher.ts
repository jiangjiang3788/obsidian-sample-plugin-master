// src/features/settings/VaultWatcher.ts
// ---------------------------------------------------------------------------
// Phase2: Vault 事件监听属于 Obsidian 集成层，不能放在 core。
// - core 的目标是 "import 'obsidian' = 0"
// - 这里保留原 VaultWatcher 逻辑，但迁移到 feature（UI/Integration）层
// ---------------------------------------------------------------------------

import type { Plugin, TAbstractFile } from 'obsidian';
import { TFile } from 'obsidian';
import type { DataStore } from '@core/public';

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
   * 定义一个可复用的文件变更处理函数
   * @param f - 被创建、修改或重命名的文件
   */
  private handleFileChange = (f: TAbstractFile): void => {
    // 确保是 Markdown 文件，然后执行扫描并通知更新
    if (f instanceof TFile && f.extension === 'md') {
      // Phase2: core 不依赖 TFile，统一使用 path 入口
      this.dataStore.scanFileByPath(f.path).then(() => this.dataStore.notifyChange());
    }
  };

  private registerEvents() {
    const { vault } = this.plugin.app;

    // 'create' 和 'modify' 事件共用同一个处理函数
    this.plugin.registerEvent(vault.on('modify', this.handleFileChange));
    this.plugin.registerEvent(vault.on('create', this.handleFileChange));

    this.plugin.registerEvent(
      vault.on('delete', (f) => {
        if (f instanceof TFile && f.extension === 'md') {
          this.dataStore.removeFileItems(f.path);
          this.dataStore.notifyChange();
        }
      })
    );

    this.plugin.registerEvent(
      vault.on('rename', (f, old) => {
        if (f instanceof TFile && f.extension === 'md') {
          this.dataStore.removeFileItems(old);
          // 重命名操作中的“重新扫描新文件”复用 handleFileChange
          this.handleFileChange(f);
        }
      })
    );
  }
}
