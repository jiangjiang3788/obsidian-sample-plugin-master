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
import { AiChatService, RetrievalService, ChatSessionStore } from '@core/public';
import type { NaturalRecordCommand } from '@core/types/ai-schema';

import { AiTextPromptModal } from './modals/AiTextPromptModal';
import { AiBatchConfirmModal } from './modals/AiBatchConfirmModal';
import { QuickInputModal } from './modals/QuickInputModal';
import { NamePromptModal } from './modals/NamePromptModal';
import { AiChatModal } from './modals/AiChatModal';
import { CheckinManagerModal } from './modals/CheckinManagerModal';
import { todayISO } from '@core/public';
import type { Item } from '@core/public';
import type { CheckinManagerData } from './modals/CheckinManagerModal';

@singleton()
export class ObsidianModalPort implements ModalPort {
  constructor(
    @inject(AppToken) private app: App,
    // DI Round2: remove container.resolve() from adapter; use pure constructor injection
    @inject(AiChatService) private chatService: AiChatService,
    @inject(RetrievalService) private retrievalService: RetrievalService,
    @inject(ChatSessionStore) private sessionStore: ChatSessionStore,
  ) {}

  openAiTextPrompt(): Promise<string | null> {
    const modal = new AiTextPromptModal(this.app);
    return modal.openAndGetValue();
  }

  openAiBatchConfirm(args: {
    title: string;
    items: string[];
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean> {
    // items 在 core 侧是 string[]（通常是摘要）；这里需要 NaturalRecordCommand 时只能走更上游转换
    // 为兼容现有实现：若调用者传的是 string[]，这里弹一个只读确认（不落库）
    // 如果你后续要支持 NaturalRecordCommand 批量保存，建议把 ModalPort 的 items 类型改回 NaturalRecordCommand[]
    const itemsAsCommands = (args.items as any) as NaturalRecordCommand[];
    const modal = new AiBatchConfirmModal(this.app, {
      title: args.title,
      items: itemsAsCommands,
      confirmText: args.confirmText,
      cancelText: args.cancelText,
    });
    return modal.openAndGetResult();
  }

  openQuickInput(blockId?: string): void {
    new QuickInputModal(this.app, blockId || '').open();
  }

  openNamePrompt(options: NamePromptOptions): Promise<string | null> {
    const modal = new NamePromptModal(this.app, options);
    return modal.openAndGetValue();
  }

  openAiChat(): void {
    const aiServices = {
      chatService: this.chatService,
      retrievalService: this.retrievalService,
      sessionStore: this.sessionStore,
    };
    new AiChatModal(this.app, aiServices).open();
  }

  openCheckinManager(): void {
	    // Provide safe defaults for ad-hoc opening.
	    const emptyItems: Item[] = [];
	    const noopSave = async (_data: CheckinManagerData) => {};
	    new CheckinManagerModal(this.app, todayISO(), emptyItems, noopSave).open();
  }
}
