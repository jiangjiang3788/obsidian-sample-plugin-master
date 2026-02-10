// src/core/ports/EventsPort.ts
// ---------------------------------------------------------------------------
// Phase0 P1: core -> platform boundary (Events/Vault watchers)
// ---------------------------------------------------------------------------
// Goal:
// - core/features 不直接依赖 Obsidian 的 vault/workspace 事件类型
// - 通过 EventsPort 抽象“Markdown 文件变更”事件，便于后续迁移/测试/替换
// ---------------------------------------------------------------------------

import type { InjectionToken } from 'tsyringe';

export type UnsubscribeFn = () => void;

export interface EventsPort {
  /**
   * 监听 Markdown 文件的 create/modify 事件。
   * 回调参数为文件路径（vault 内部 path）。
   */
  onMarkdownCreateOrModify(cb: (path: string) => void): UnsubscribeFn;

  /** 监听 Markdown 文件 delete 事件 */
  onMarkdownDelete(cb: (path: string) => void): UnsubscribeFn;

  /** 监听 Markdown 文件 rename 事件（newPath, oldPath） */
  onMarkdownRename(cb: (newPath: string, oldPath: string) => void): UnsubscribeFn;

  /**
   * 监听 workspace 当前文件变化（path 或 null）。
   * 说明：这是“workspace 事件迁移”的最小切片，便于 features 层不直接触碰 app.workspace。
   */
  onWorkspaceActiveFileChange(cb: (path: string | null) => void): UnsubscribeFn;
}

export const EVENTS_PORT_TOKEN: InjectionToken<EventsPort> = 'EventsPort';
