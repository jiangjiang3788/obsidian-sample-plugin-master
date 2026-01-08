// src/app/store/slices/blocks.slice.ts
/**
 * BlocksSlice - Block 状态切片
 * Role: Zustand Slice (状态管理)
 * 
 * 【S2 规范】Settings 真同源
 * - SettingsRepository 是 settings 的唯一写入口
 * - 本 Slice 只调用 settingsRepository.update()，不直接写 settings
 * - settings 由 ServiceManager 订阅 SettingsRepository 后统一同步到 Zustand
 * - 本 Slice 只管理辅助状态：isLoading、error
 * 
 * Do:
 * - 管理 Block 相关辅助状态（loading/error）
 * - 提供 Block CRUD actions，委托写操作给 SettingsRepository
 * - 所有 IO 委托给 SettingsRepository
 * 
 * Don't:
 * - 直接进行 IO 操作
 * - 直接写 settings（禁止 set({ settings: ... })）
 * - 持有 plugin 实例
 */

import type { StateCreator } from 'zustand';
import type { ZustandAppStore } from '../useAppStore';
import type { SettingsRepository } from '@/core/services/SettingsRepository';
import type { BlockTemplate, ThemeOverride } from '@/core/types/schema';

// 简单的 UUID 生成函数
function generateId(): string {
    return 'block_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

// ============== 类型定义 ==============

export interface BlocksSlice {
    // Block CRUD Actions
    addBlock: (name: string) => Promise<BlockTemplate | undefined>;
    updateBlock: (id: string, updates: Partial<BlockTemplate>) => Promise<void>;
    deleteBlock: (id: string) => Promise<void>;
    duplicateBlock: (id: string) => Promise<BlockTemplate | undefined>;
    moveBlock: (id: string, direction: 'up' | 'down') => Promise<void>;
}

// ============== Slice 工厂 ==============

/**
 * 创建 Blocks Slice
 * @param settingsRepository 设置仓库实例
 */
export function createBlocksSlice(
    settingsRepository: SettingsRepository
): StateCreator<ZustandAppStore, [], [], BlocksSlice> {
    return (set, get) => ({
        /**
         * 添加新 Block
         */
        addBlock: async (name: string): Promise<BlockTemplate | undefined> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[BlocksSlice] Store 未初始化，无法添加 Block');
                return undefined;
            }

            set({ isLoading: true, error: null });

            try {
                const newBlock: BlockTemplate = {
                    id: generateId(),
                    name,
                    targetFile: '',
                    appendUnderHeader: '',
                    outputTemplate: '',
                    fields: [],
                };

                // S2: 只调用 settingsRepository.update()，settings 由 ServiceManager 订阅后统一同步
                await settingsRepository.update(draft => {
                    if (!draft.inputSettings) {
                        draft.inputSettings = { blocks: [], themes: [], overrides: [] };
                    }
                    if (!draft.inputSettings.blocks) {
                        draft.inputSettings.blocks = [];
                    }
                    draft.inputSettings.blocks.push(newBlock);
                });

                set({ isLoading: false });
                return newBlock;
            } catch (error: any) {
                console.error('[BlocksSlice] addBlock 失败:', error);
                set({ error: error.message || '添加 Block 失败', isLoading: false });
                return undefined;
            }
        },

        /**
         * 更新 Block
         */
        updateBlock: async (id: string, updates: Partial<BlockTemplate>): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[BlocksSlice] Store 未初始化，无法更新 Block');
                return;
            }

            set({ isLoading: true, error: null });

            try {
                // S2: 只调用 settingsRepository.update()，settings 由 ServiceManager 订阅后统一同步
                await settingsRepository.update(draft => {
                    const blocks = draft.inputSettings?.blocks || [];
                    const index = blocks.findIndex(b => b.id === id);
                    if (index !== -1) {
                        Object.assign(blocks[index], updates);
                    }
                });

                set({ isLoading: false });
            } catch (error: any) {
                console.error('[BlocksSlice] updateBlock 失败:', error);
                set({ error: error.message || '更新 Block 失败', isLoading: false });
            }
        },

        /**
         * 删除 Block
         */
        deleteBlock: async (id: string): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[BlocksSlice] Store 未初始化，无法删除 Block');
                return;
            }

            set({ isLoading: true, error: null });

            try {
                // S2: 只调用 settingsRepository.update()，settings 由 ServiceManager 订阅后统一同步
                await settingsRepository.update(draft => {
                    const blocks = draft.inputSettings?.blocks || [];
                    const index = blocks.findIndex(b => b.id === id);
                    if (index !== -1) {
                        blocks.splice(index, 1);
                    }
                    // 同时删除相关的 overrides
                    if (draft.inputSettings?.overrides) {
                        draft.inputSettings.overrides = draft.inputSettings.overrides.filter(
                            (o: ThemeOverride) => o.blockId !== id
                        );
                    }
                });

                set({ isLoading: false });
            } catch (error: any) {
                console.error('[BlocksSlice] deleteBlock 失败:', error);
                set({ error: error.message || '删除 Block 失败', isLoading: false });
            }
        },

        /**
         * 复制 Block
         */
        duplicateBlock: async (id: string): Promise<BlockTemplate | undefined> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[BlocksSlice] Store 未初始化，无法复制 Block');
                return undefined;
            }

            const blocks = state.settings.inputSettings?.blocks || [];
            const source = blocks.find(b => b.id === id);
            if (!source) {
                console.error('[BlocksSlice] 找不到要复制的 Block:', id);
                return undefined;
            }

            set({ isLoading: true, error: null });

            try {
                const newBlock: BlockTemplate = {
                    ...source,
                    id: generateId(),
                    name: `${source.name} (副本)`,
                };

                // S2: 只调用 settingsRepository.update()，settings 由 ServiceManager 订阅后统一同步
                await settingsRepository.update(draft => {
                    const blocks = draft.inputSettings?.blocks || [];
                    const sourceIndex = blocks.findIndex(b => b.id === id);
                    if (sourceIndex !== -1) {
                        blocks.splice(sourceIndex + 1, 0, newBlock);
                    } else {
                        blocks.push(newBlock);
                    }
                });

                set({ isLoading: false });
                return newBlock;
            } catch (error: any) {
                console.error('[BlocksSlice] duplicateBlock 失败:', error);
                set({ error: error.message || '复制 Block 失败', isLoading: false });
                return undefined;
            }
        },

        /**
         * 移动 Block
         */
        moveBlock: async (id: string, direction: 'up' | 'down'): Promise<void> => {
            const state = get();
            if (!state.isInitialized) {
                console.error('[BlocksSlice] Store 未初始化，无法移动 Block');
                return;
            }

            set({ isLoading: true, error: null });

            try {
                // S2: 只调用 settingsRepository.update()，settings 由 ServiceManager 订阅后统一同步
                await settingsRepository.update(draft => {
                    const blocks = draft.inputSettings?.blocks || [];
                    const index = blocks.findIndex(b => b.id === id);
                    if (index === -1) return;

                    const newIndex = direction === 'up' ? index - 1 : index + 1;
                    if (newIndex < 0 || newIndex >= blocks.length) return;

                    const [removed] = blocks.splice(index, 1);
                    blocks.splice(newIndex, 0, removed);
                });

                set({ isLoading: false });
            } catch (error: any) {
                console.error('[BlocksSlice] moveBlock 失败:', error);
                set({ error: error.message || '移动 Block 失败', isLoading: false });
            }
        },
    });
}
