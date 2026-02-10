// src/app/capabilities/capabilities/ai.ts
import type { ThinkSettings } from '@core/public';
import { container } from 'tsyringe';
import { MODAL_PORT_TOKEN, type ModalPort } from '@core/public';
import { AiChatService, ChatSessionStore, RetrievalService } from '@core/public';
import { devWarn } from '@core/public';

export interface AiCapability {
    /**
     * 打开 AI 对话（示例能力）。
     * 具体 modal/service 的组合由 app/main 负责注入。
     */
    openChat(): void;
}

/**
 * ✅ 只允许导出 createXxxCapability + XxxCapability（由 capability-gate 强制）
 * 这里先给一个最小实现，占位，方便逐步迁移。
 */
export function createAiCapability(_app: unknown, _settings: ThinkSettings): AiCapability {
    return {
        openChat() {
            try {
                // Phase0 P1: modal 打开统一走 platform adapter（避免 features 层 new Modal）
                const modalPort = container.resolve<ModalPort>(MODAL_PORT_TOKEN);
                modalPort.openAiChat();
            } catch (err) {
                devWarn('[AiCapability] openChat() failed', err);
            }
        },
    };
}
