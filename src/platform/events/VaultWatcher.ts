// src/platform/events/VaultWatcher.ts
// ---------------------------------------------------------------------------
// Phase0 P1: platform boundary (EventsPort) - Vault watcher is now Obsidian-free
// ---------------------------------------------------------------------------
// Goal:
// - features 不直接 import 'obsidian'，通过 EventsPort 监听 vault 变化
// - DataStore 统一使用 path 入口（scanFileByPath/removeFileItems）
// ---------------------------------------------------------------------------

import type { DataStore } from '@core/public';
import type { EventsPort, UnsubscribeFn } from '@core/public';

/** 监听 Vault 变化并与 DataStore 联动（节流由 DataStore 内部处理） */
export class VaultWatcher {
  private dataStore: DataStore;
  private events: EventsPort;
  private unsubscribers: UnsubscribeFn[] = [];

  constructor(events: EventsPort, dataStore: DataStore) {
    this.events = events;
    this.dataStore = dataStore;
    this.registerEvents();
  }

  private registerEvents(): void {
    // create/modify
    this.unsubscribers.push(
      this.events.onMarkdownCreateOrModify((path) => {
        this.dataStore.scanFileByPath(path).then(() => this.dataStore.notifyChange());
      })
    );

    // delete
    this.unsubscribers.push(
      this.events.onMarkdownDelete((path) => {
        this.dataStore.removeFileItems(path);
        this.dataStore.notifyChange();
      })
    );

    // rename
    this.unsubscribers.push(
      this.events.onMarkdownRename((newPath, oldPath) => {
        this.dataStore.removeFileItems(oldPath);
        this.dataStore.scanFileByPath(newPath).then(() => this.dataStore.notifyChange());
      })
    );
  }

  /** 可选：手动释放（目前 ObsidianEventsPort 也会在 unload 自动解绑） */
  dispose(): void {
    const subs = this.unsubscribers;
    this.unsubscribers = [];
    for (const unsub of subs) {
      try { unsub(); } catch {}
    }
  }
}
