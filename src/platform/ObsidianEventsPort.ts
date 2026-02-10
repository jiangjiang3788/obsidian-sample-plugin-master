// src/platform/ObsidianEventsPort.ts
// ---------------------------------------------------------------------------
// Phase0 P1: platform adapter for EventsPort
// ---------------------------------------------------------------------------

import type { Plugin, TAbstractFile } from 'obsidian';
import { TFile } from 'obsidian';

import type { EventsPort, UnsubscribeFn } from '@core/public';

/** Obsidian 实现：把 vault/workspace 事件转换成 core 侧的 EventsPort 抽象 */
export class ObsidianEventsPort implements EventsPort {
  private plugin: Plugin;

  constructor(plugin: Plugin) {
    this.plugin = plugin;
  }

  onMarkdownCreateOrModify(cb: (path: string) => void): UnsubscribeFn {
    const { vault } = this.plugin.app;

    const handler = (f: TAbstractFile): void => {
      if (f instanceof TFile && f.extension === 'md') {
        cb(f.path);
      }
    };

    const modifyRef = vault.on('modify', handler);
    const createRef = vault.on('create', handler);

    // 交给 Obsidian 的插件生命周期管理（unload 时自动解绑）
    this.plugin.registerEvent(modifyRef);
    this.plugin.registerEvent(createRef);

    return () => {
      try {
        vault.offref(modifyRef);
        vault.offref(createRef);
      } catch {
        // offref 在部分版本/状态下可能抛错，忽略即可（unload 也会自动解绑）
      }
    };
  }

  onMarkdownDelete(cb: (path: string) => void): UnsubscribeFn {
    const { vault } = this.plugin.app;

    const handler = (f: TAbstractFile): void => {
      if (f instanceof TFile && f.extension === 'md') {
        cb(f.path);
      }
    };

    const ref = vault.on('delete', handler);
    this.plugin.registerEvent(ref);

    return () => {
      try {
        vault.offref(ref);
      } catch {}
    };
  }

  onMarkdownRename(cb: (newPath: string, oldPath: string) => void): UnsubscribeFn {
    const { vault } = this.plugin.app;

    const handler = (f: TAbstractFile, oldPath: string): void => {
      if (f instanceof TFile && f.extension === 'md') {
        cb(f.path, oldPath);
      }
    };

    const ref = vault.on('rename', handler);
    this.plugin.registerEvent(ref);

    return () => {
      try {
        vault.offref(ref);
      } catch {}
    };
  }

  onWorkspaceActiveFileChange(cb: (path: string | null) => void): UnsubscribeFn {
    const { workspace } = this.plugin.app;

    // Obsidian: 'file-open' fires when active file changes (or becomes null)
    const ref = workspace.on('file-open', (file: TFile | null) => {
      cb(file ? file.path : null);
    });

    this.plugin.registerEvent(ref);

    return () => {
      try {
        workspace.offref(ref);
      } catch {}
    };
  }
}
