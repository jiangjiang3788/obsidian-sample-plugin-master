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
  notice(message: string, timeoutMs?: number): void;
}

export const UI_PORT_TOKEN: InjectionToken<UiPort> = 'UiPort';
