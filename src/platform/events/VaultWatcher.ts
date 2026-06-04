// src/platform/events/VaultWatcher.ts
// ---------------------------------------------------------------------------
// Phase0 P1: platform boundary (EventsPort) - Vault watcher is now Obsidian-free
// ---------------------------------------------------------------------------
// Goal:
// - features 不直接 import 'obsidian'，通过 EventsPort 监听 vault 变化
// - DataStore 统一使用 path 入口（scanFileByPath/removeFileItems）
// - 高频 create/modify 事件按文件防抖，避免保存时重复扫描同一文件
// ---------------------------------------------------------------------------

import type { DataStore } from '@core/public';
import { devWarn, type EventsPort, type UnsubscribeFn } from '@core/public';

/** 监听 Vault 变化并与 DataStore 联动 */
export class VaultWatcher {
  private dataStore: DataStore;
  private events: EventsPort;
  private unsubscribers: UnsubscribeFn[] = [];
  private pendingScanTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private disposed = false;
  private readonly scanDebounceMs = 250;

  constructor(events: EventsPort, dataStore: DataStore) {
    this.events = events;
    this.dataStore = dataStore;
    this.registerEvents();
  }

  private registerEvents(): void {
    // create/modify
    this.unsubscribers.push(
      this.events.onMarkdownCreateOrModify((path) => {
        this.enqueueScan(path, 'create-or-modify');
      })
    );

    // delete
    this.unsubscribers.push(
      this.events.onMarkdownDelete((path) => {
        this.cancelPendingScan(path);
        this.dataStore.removeFileItems(path);
        this.dataStore.notifyChange();
      })
    );

    // rename
    this.unsubscribers.push(
      this.events.onMarkdownRename((newPath, oldPath) => {
        this.cancelPendingScan(oldPath);
        this.dataStore.removeFileItems(oldPath);
        this.enqueueScan(newPath, 'rename');
      })
    );
  }

  private enqueueScan(path: string, reason: string): void {
    if (this.disposed) return;

    this.cancelPendingScan(path);
    const timer = setTimeout(() => {
      this.pendingScanTimers.delete(path);
      if (this.disposed) return;

      this.dataStore
        .scanFileByPath(path)
        .then(() => {
          if (!this.disposed) {
            this.dataStore.notifyChange();
          }
        })
        .catch((error) => {
          devWarn('[VaultWatcher] Markdown 变更扫描失败', { path, reason, error });
        });
    }, this.scanDebounceMs);

    this.pendingScanTimers.set(path, timer);
  }

  private cancelPendingScan(path: string): void {
    const timer = this.pendingScanTimers.get(path);
    if (!timer) return;

    clearTimeout(timer);
    this.pendingScanTimers.delete(path);
  }

  /** 可选：手动释放（目前 ObsidianEventsPort 也会在 unload 自动解绑） */
  dispose(): void {
    this.disposed = true;

    for (const timer of this.pendingScanTimers.values()) {
      clearTimeout(timer);
    }
    this.pendingScanTimers.clear();

    const subs = this.unsubscribers;
    this.unsubscribers = [];
    for (const unsub of subs) {
      try { unsub(); } catch {}
    }
  }
}
