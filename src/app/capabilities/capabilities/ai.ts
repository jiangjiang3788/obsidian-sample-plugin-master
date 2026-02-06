// src/app/capabilities/capabilities/ai.ts
import type { App } from 'obsidian';
import type { ThinkSettings } from '@core/public';
import { container } from 'tsyringe';
import { AiChatService, ChatSessionStore, RetrievalService } from '@core/public';
import { AiChatModal } from '@features/aichat';
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
export function createAiCapability(_app: App, _settings: ThinkSettings): AiCapability {
    return {
        openChat() {
            try {
                // ✅ 组合根：在 app/capabilities 层完成 resolve + 组合
                const aiServices = {
                    chatService: container.resolve(AiChatService),
                    retrievalService: container.resolve(RetrievalService),
                    sessionStore: container.resolve(ChatSessionStore),
                };

                new AiChatModal(_app, aiServices).open();
            } catch (err) {
                devWarn('[AiCapability] openChat() failed', err);
            }
        },
    };
}
