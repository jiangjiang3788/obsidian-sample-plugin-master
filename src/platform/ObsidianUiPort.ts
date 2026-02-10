// src/platform/ObsidianUiPort.ts
// ---------------------------------------------------------------------------
// Phase2: platform adapter for UiPort
// ---------------------------------------------------------------------------
// This is the ONLY layer that touches Obsidian's Notice API for core services.

import { singleton } from 'tsyringe';
import { Notice } from 'obsidian';
import type { UiNoticeHandle, UiPort } from '@core/ports/UiPort';

@singleton()
export class ObsidianUiPort implements UiPort {
  notice(message: string, timeoutMs?: number): UiNoticeHandle {
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
    };
  }
}
