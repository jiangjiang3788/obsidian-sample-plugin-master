// src/platform/ObsidianUiPort.ts
// ---------------------------------------------------------------------------
// Phase2: platform adapter for UiPort
// ---------------------------------------------------------------------------
// This is the ONLY layer that touches Obsidian's Notice API for core services.

import { singleton } from 'tsyringe';
import { Notice } from 'obsidian';
import { isDevConsoleStackEnabled } from '@shared/public';
import type { UiNoticeHandle, UiPort } from '@core/ports/UiPort';

@singleton()
export class ObsidianUiPort implements UiPort {
  notice(message: string, timeoutMs?: number): UiNoticeHandle {
    // 开发模式：即使调用方只传 message，也在控制台打印调用栈，方便定位来源
    if (isDevConsoleStackEnabled()) {
      try {
        console.trace('[Think][Notice]', message);
      } catch {
        // no-op
      }
    }
    // Obsidian Notice: default timeout is determined by Obsidian; we pass through if provided.
    // Using `as any` avoids tight coupling to Notice's overload signatures across Obsidian versions.
    const notice = new (Notice as any)(message, timeoutMs);
    return {
      hide(): void {
        try {
          notice?.hide?.();
        } catch {
          // no-op
        }
      },
      setMessage(nextMessage: string): void {
        try {
          if (typeof notice?.setMessage === 'function') {
            notice.setMessage(nextMessage);
          }
        } catch {
          // no-op
        }
      },
    };
  }
}
