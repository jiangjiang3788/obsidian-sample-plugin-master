// core/VaultWatcher.ts
import { Plugin, TFile } from 'obsidian';
import { DataStore } from '@core/services/dataStore';

/** 监听 Vault 变化并与 DataStore 联动（节流由 DataStore 内部处理） */
export class VaultWatcher {
  private plugin: Plugin;
  private dataStore: DataStore;

  constructor(plugin: Plugin, dataStore: DataStore) {
    this.plugin    = plugin;
    this.dataStore = dataStore;
    this.registerEvents();
  }

  private registerEvents() {
    const { app } = this.plugin;
    const onVault = app.vault.on.bind(app.vault);
    const rescan  = (f: TFile) =>
      this.dataStore.scanFile(f).then(() => this.dataStore.notifyChange());

    this.plugin.registerEvent(onVault('modify', f => {
      if (f instanceof TFile && f.extension === 'md') rescan(f);
    }));
    this.plugin.registerEvent(onVault('create', f => {
      if (f instanceof TFile && f.extension === 'md') rescan(f);
    }));
    this.plugin.registerEvent(onVault('delete', f => {
      if (f instanceof TFile && f.extension === 'md') {
        this.dataStore.removeFileItems(f.path);
        this.dataStore.notifyChange();
      }
    }));
    this.plugin.registerEvent(onVault('rename', (f, old) => {
      if (f instanceof TFile && f.extension === 'md') {
        this.dataStore.removeFileItems(old);
        rescan(f);
      }
    }));
  }
}