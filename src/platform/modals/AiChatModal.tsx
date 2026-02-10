// src/features/aichat/AiChatModal.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import type { App } from 'obsidian';
import { Modal } from 'obsidian';
import { createServices, type Services, mountWithServices, unmountPreact } from '@/app/public';
import { AiChatModalContainer } from '@/features/aichat/AiChatModalContainer';
import type { AiServices } from '@/features/aichat/types';

// 对外继续导出 AiServices（便于上层注入依赖时标注类型）
export type { AiServices } from '@/features/aichat/types';

// ============== Modal 包装（API 保持不变） ==============

export class AiChatModal extends Modal {
    // Phase 4.3: features 层不再拥有“组合根”权力
    // - 依赖必须由上层（main/app/ServiceManager）注入
    private aiServices?: AiServices;
    private services: Services;
    private keydownStopper?: (e: KeyboardEvent) => void;

    constructor(app: App, aiServices?: AiServices) {
        super(app);
        this.aiServices = aiServices;
        // UI Services 统一通过 app/public 获取（内部会使用全局 container）
        this.services = createServices();
    }

    private ensureAiServices(): AiServices {
        if (!this.aiServices) {
            throw new Error('[AiChatModal] aiServices not provided. ObsidianModalPort must inject AiServices.');
        }
        return this.aiServices;
    }

    async onOpen() {
        this.contentEl.empty();
        this.modalEl.addClass('think-ai-chat-modal');
        this.modalEl.style.width = '90vw';
        this.modalEl.style.maxWidth = '1000px';
        this.modalEl.style.height = '85vh';

        // 阻止 Modal 拦截输入事件
        this.keydownStopper = (e: KeyboardEvent) => {
            e.stopPropagation();
        };
        this.contentEl.addEventListener('keydown', this.keydownStopper);

        const aiServices = this.ensureAiServices();

        // 初始化 sessionStore
        await aiServices.sessionStore.initialize();

        mountWithServices(
            this.contentEl,
            <AiChatModalContainer closeModal={() => this.close()} services={aiServices} />,
            this.services
        );
    }

    onClose() {
        if (this.keydownStopper) {
            this.contentEl.removeEventListener('keydown', this.keydownStopper);
            this.keydownStopper = undefined;
        }
        unmountPreact(this.contentEl);
    }
}
