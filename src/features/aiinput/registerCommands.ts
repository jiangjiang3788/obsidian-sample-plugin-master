// src/features/aiinput/registerCommands.ts
/**
 * S7.2: AI 自然语言快速记录命令注册 - 移除 AppStore 依赖
 * - 使用 zustand getAppStoreInstance() 获取 settings
 * - 使用 SettingsProviderToken 创建 AI 服务
 */

import { Notice } from 'obsidian';
import { container } from 'tsyringe';
import type ThinkPlugin from '@/main';
import { QuickInputModal } from '@/features/quickinput/QuickInputModal';
import { AiTextPromptModal } from './AiTextPromptModal';
import { AiBatchConfirmModal } from './AiBatchConfirmModal';
import { AiConfigCache, AiHttpClient, AiNaturalLanguageRecordParser } from '@/core/ai';
import { getAppStoreInstance } from '@/app/store/useAppStore';
import { SettingsProviderToken, type ISettingsProvider } from '@/core/services/types';

/**
 * 创建一个基于 zustand store 的 SettingsProvider
 */
function createZustandSettingsProvider(): ISettingsProvider {
    return {
        getSettings: () => getAppStoreInstance().getState().settings
    };
}

/**
 * 注册 AI 输入相关命令
 * S7.2: 移除 appStore 参数，使用 zustand store
 */
export function registerAiInputCommands(plugin: ThinkPlugin) {
    // S7.2: 创建基于 zustand 的 settings provider
    const settingsProvider = createZustandSettingsProvider();
    
    // 创建 AI 相关服务实例
    const cache = new AiConfigCache(settingsProvider);
    const http = new AiHttpClient();
    const parser = new AiNaturalLanguageRecordParser(settingsProvider, cache, http);

    // 注册命令：AI 自然语言快速记录
    plugin.addCommand({
        id: 'think-ai-natural-input',
        name: 'AI: 自然语言快速记录',
        callback: async () => {
            // S7.2: 使用 zustand store 获取 settings
            const settings = getAppStoreInstance().getState().settings;
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
