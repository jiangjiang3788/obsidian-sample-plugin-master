// src/core/ports/UiPort.ts
// ---------------------------------------------------------------------------
// Phase2: core -> platform boundary (UI)
// ---------------------------------------------------------------------------
// Goal:
// - core/services 不直接 import 'obsidian'（例如 Notice / Modal / App）
// - 通过 UiPort 把“用户可见反馈”上移到 platform adapter
// ---------------------------------------------------------------------------

import type { InjectionToken } from 'tsyringe';

/**
 * UiPort
 *
 * 最小 UI 反馈能力集合。
 * 后续如果需要 confirm / modal，可以在这里增量扩展。
 */
export interface UiPort {
  /**
   * 显示一条通知。
   *
   * - timeoutMs = 0 表示“常驻/长时间”，调用方可通过返回值 hide() 主动关闭。
   * - 对于实现不支持 hide 的情况，也应返回一个 no-op 的 handle，避免调用方崩溃。
   */
  notice(message: string, timeoutMs?: number): UiNoticeHandle;
}

/**
 * UI 通知句柄（用于主动关闭，例如“解析中...”常驻提示）。
 */
export interface UiNoticeHandle {
  hide(): void;

  /**
   * 更新通知内容。
   *
   * Obsidian Notice 原生支持 setMessage；其他平台实现可以不提供，
   * 调用方需要把它当作可选能力使用。
   */
  setMessage?(message: string): void;
}

export const UI_PORT_TOKEN: InjectionToken<UiPort> = 'UiPort';
