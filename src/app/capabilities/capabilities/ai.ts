// src/app/capabilities/capabilities/ai.ts
import type { App } from 'obsidian';
import type { ThinkSettings } from '@core/public';

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
            // NOTE: Phase 4.5 只搭壳 + 冻结未来；具体实现迁移会在后续逐步完成
            console.warn('[AiCapability] openChat() not wired yet. Wire in main/app composition root.');
        },
    };
}
