// src/platform/ObsidianModalPort.ts
// ---------------------------------------------------------------------------
// Phase0/1: platform adapter for ModalPort
// ---------------------------------------------------------------------------
// - 统一负责创建/打开具体 Obsidian Modal
// - features/shared 不再直接 new Modal，也不 import 'obsidian'

import { singleton, inject } from 'tsyringe';
import type { App } from 'obsidian';
import { AppToken } from '@core/services/types';
import type { ModalPort, NamePromptOptions } from '@core/public';
import type { NaturalRecordCommand } from '@core/types/ai-schema';

import { AiTextPromptModal } from './modals/AiTextPromptModal';
import { AiBatchConfirmModal } from './modals/AiBatchConfirmModal';
import { QuickInputModal } from './modals/QuickInputModal';
import { NamePromptModal } from './modals/NamePromptModal';

@singleton()
export class ObsidianModalPort implements ModalPort {
  constructor(@inject(AppToken) private app: App) {}

  openAiTextPrompt(): Promise<string | null> {
    const modal = new AiTextPromptModal(this.app);
    return modal.openAndGetValue();
  }

  openAiBatchConfirm(items: NaturalRecordCommand[]): void {
    new AiBatchConfirmModal(this.app, items).open();
  }

  openQuickInput(blockId: string): void {
    new QuickInputModal(this.app, blockId).open();
  }

  openNamePrompt(options: NamePromptOptions): Promise<string | null> {
    const modal = new NamePromptModal(this.app, options);
    return modal.openAndGetValue();
  }
}
