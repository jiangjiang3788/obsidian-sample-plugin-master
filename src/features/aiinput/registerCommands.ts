// src/features/aiinput/registerCommands.ts
/**
 * P0-3: AI 自然语言快速记录命令注册 - 通过 app/public 获取 store
 * - 禁止在 features 层直接 import tsyringe container
 * - 使用 createServices() 作为唯一入口拿到 zustandStore
 * - 使用纯函数 getZustandState(store, selector) 读取 settings
 */

import type ThinkPlugin from '@/main';
import { AiTextPromptModal, AiBatchConfirmModal } from '@/app/public';
import { AiConfigCache, AiHttpClient, AiNaturalLanguageRecordParser, devError } from '@core/public';
import { createServices, getZustandState, type AppStoreInstance } from '@/app/public';
import type { ISettingsProvider } from '@core/public';
import { createTakeLatest, CancelledError } from '@shared/public';

/**
 * 创建一个基于 zustand store 的 SettingsProvider
 * P0-3: 使用纯函数版本，显式传入 store
 */
function createZustandSettingsProvider(store: AppStoreInstance): ISettingsProvider {
    return {
        getSettings: () => getZustandState(store, s => s.settings)
    };
}

/**
 * 注册 AI 输入相关命令
 * P0-3: 从 app/public 获取 store
 */
export function registerAiInputCommands(plugin: ThinkPlugin) {
    // Phase 4.3: 只能通过 app/public 获取 store（禁止 container 下沉）
    const { zustandStore: store, uiPort: ui } = createServices();
    
    // P0-3: 创建基于 zustand 的 settings provider（传入 store）
    const settingsProvider = createZustandSettingsProvider(store);
    
    // 创建 AI 相关服务实例
    const cache = new AiConfigCache(settingsProvider);
    const http = new AiHttpClient();
    const parser = new AiNaturalLanguageRecordParser(settingsProvider, cache, http);

    // B-Ext: 同一命令被重复触发时，自动取消上一次解析请求
    const takeLatest = createTakeLatest('ai-natural-input');
    // 确保插件卸载时取消潜在的未完成请求
    plugin.register(() => takeLatest.dispose());

    // 注册命令：AI 自然语言快速记录
    plugin.addCommand({
        id: 'think-ai-natural-input',
        name: 'AI: 自然语言快速记录',
        callback: async () => {
            // P0-3: 使用纯函数版本获取 settings
            const settings = getZustandState(store, s => s.settings);
            const ai = settings.aiSettings;

            // 检查 AI 是否启用
            if (!ai?.enabled) {
                ui.notice('AI 快速记录未启用，请在设置中开启', 4000);
                return;
            }

            // 检查 API 配置
            if (!ai.apiEndpoint || !ai.apiKey || !ai.model) {
                ui.notice('AI 配置不完整，请在设置中配置 API 端点、密钥和模型', 5000);
                return;
            }

            // 检查是否有可用的 Block
            const blocks = settings.inputSettings?.blocks ?? [];
            if (blocks.length === 0) {
                ui.notice('没有可用的 Block 模板，请先在"快速输入"设置中创建', 5000);
                return;
            }

            // 打开输入 Modal
            const promptModal = new AiTextPromptModal(plugin.app);
            const text = await promptModal.openAndGetValue();

            if (!text?.trim()) {
                return; // 用户取消或输入为空
            }

            // 显示解析中提示
            const loadingNotice = ui.notice('AI 正在解析...', 0);

            try {
                // 调用解析器（支持取消）
                const batch = await takeLatest.run((signal) => parser.parse({ text, now: new Date(), signal }));

                // 关闭加载提示
                loadingNotice.hide();

                // 检查结果
                if (!batch.items?.length) {
                    ui.notice('AI 未能识别出可记录内容，请换种说法再试', 5000);
                    return;
                }

                // 显示识别结果数量
                ui.notice(`AI 识别出 ${batch.items.length} 条记录`, 2000);

                // 使用批量确认 Modal
                new AiBatchConfirmModal(
                    plugin.app,
                    batch.items
                ).open();

            } catch (e: any) {
                if (e instanceof CancelledError) {
                    loadingNotice.hide();
                    return;
                }
                loadingNotice.hide();
                devError('AI 解析失败:', e);
                ui.notice(`AI 解析失败：${e?.message ?? e}`, 6000);
            }
        },
    });
}
