// src/features/aiinput/registerCommands.ts
// AI 自然语言快速记录命令注册

import { Notice } from 'obsidian';
import type ThinkPlugin from '@/main';
import { AppStore } from '@/app/AppStore';
import { QuickInputModal } from '@/features/quickinput/QuickInputModal';
import { AiTextPromptModal } from './AiTextPromptModal';
import { AiBatchConfirmModal } from './AiBatchConfirmModal';
import { AiConfigCache, AiHttpClient, AiNaturalLanguageRecordParser } from '@/core/ai';

/**
 * 注册 AI 输入相关命令
 */
export function registerAiInputCommands(plugin: ThinkPlugin, appStore: AppStore) {
    // 创建 AI 相关服务实例
    const cache = new AiConfigCache(appStore);
    const http = new AiHttpClient();
    const parser = new AiNaturalLanguageRecordParser(appStore, cache, http);

    // 注册命令：AI 自然语言快速记录
    plugin.addCommand({
        id: 'think-ai-natural-input',
        name: 'AI: 自然语言快速记录',
        callback: async () => {
            const settings = appStore.getSettings();
            const ai = settings.aiSettings;

            // 检查 AI 是否启用
            if (!ai?.enabled) {
                new Notice('AI 快速记录未启用，请在设置中开启', 4000);
                return;
            }

            // 检查 API 配置
            if (!ai.apiEndpoint || !ai.apiKey || !ai.model) {
                new Notice('AI 配置不完整，请在设置中配置 API 端点、密钥和模型', 5000);
                return;
            }

            // 检查是否有可用的 Block
            const blocks = settings.inputSettings?.blocks ?? [];
            if (blocks.length === 0) {
                new Notice('没有可用的 Block 模板，请先在"快速输入"设置中创建', 5000);
                return;
            }

            // 打开输入 Modal
            const promptModal = new AiTextPromptModal(plugin.app);
            const text = await promptModal.openAndGetValue();

            if (!text?.trim()) {
                return; // 用户取消或输入为空
            }

            // 显示解析中提示
            const loadingNotice = new Notice('AI 正在解析...', 0);

            try {
                // 调用解析器
                const batch = await parser.parse({ text, now: new Date() });

                // 关闭加载提示
                loadingNotice.hide();

                // 检查结果
                if (!batch.items?.length) {
                    new Notice('AI 未能识别出可记录内容，请换种说法再试', 5000);
                    return;
                }

                // 显示识别结果数量
                new Notice(`AI 识别出 ${batch.items.length} 条记录`, 2000);

                // 使用批量确认 Modal
                new AiBatchConfirmModal(
                    plugin.app,
                    batch.items
                ).open();

            } catch (e: any) {
                loadingNotice.hide();
                console.error('AI 解析失败:', e);
                new Notice(`AI 解析失败：${e?.message ?? e}`, 6000);
            }
        },
    });
}
