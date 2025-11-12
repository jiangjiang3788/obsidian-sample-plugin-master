// src/store/stores/BlockStore.ts
import type { ThinkSettings, BlockTemplate } from '@core/types/domain/schema';
import { generateId, moveItemInArray } from '@/lib/utils/core/array';
import { arrayUtils } from '@/lib/utils/core/array';

/**
 * BlockStore - 管理块模板相关状态
 * 负责块模板的增删改查、移动、复制等操作
 */
export class BlockStore {
    private _updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>;
    private _getSettings: () => ThinkSettings;

    constructor(
        updateSettings: (updater: (draft: ThinkSettings) => void) => Promise<void>,
        getSettings: () => ThinkSettings
    ) {
        this._updateSettings = updateSettings;
        this._getSettings = getSettings;
    }

    // 添加块模板
    public addBlock = async (name: string) => {
        await this._updateSettings(draft => {
            draft.inputSettings.blocks.push({
                id: generateId('blk'),
                name,
                fields: [],
                outputTemplate: ``,
                targetFile: ``,
                appendUnderHeader: '',
            });
        });
    }

    // 更新块模板
    public updateBlock = async (id: string, updates: Partial<BlockTemplate>) => {
        await this._updateSettings(draft => {
            draft.inputSettings.blocks = arrayUtils.updateById(draft.inputSettings.blocks, id, updates);
        });
    }

    // 删除块模板
    public deleteBlock = async (id: string) => {
        await this._updateSettings(draft => {
            draft.inputSettings.blocks = arrayUtils.removeByIds(draft.inputSettings.blocks, [id]);
            // 同时删除相关的覆盖配置
            draft.inputSettings.overrides = draft.inputSettings.overrides.filter(o => o.blockId !== id);
        });
    }

    // 移动块模板（上/下）
    public moveBlock = async (id: string, direction: 'up' | 'down') => {
        await this._updateSettings(draft => {
            draft.inputSettings.blocks = moveItemInArray(draft.inputSettings.blocks, id, direction);
        });
    }

    // 复制块模板
    public duplicateBlock = async (id: string) => {
        await this._updateSettings(draft => {
            const index = draft.inputSettings.blocks.findIndex(b => b.id === id);
            if (index > -1) {
                const original = draft.inputSettings.blocks[index];
                const duplicated: BlockTemplate = {
                    ...JSON.parse(JSON.stringify(original)),
                    id: generateId('blk'),
                    name: `${original.name} (副本)`
                };
                draft.inputSettings.blocks.splice(index + 1, 0, duplicated);
            }
        });
    }

    // 获取块模板列表
    public getBlocks = (): BlockTemplate[] => {
        return this._getSettings().inputSettings.blocks;
    }

    // 获取单个块模板
    public getBlock = (id: string): BlockTemplate | undefined => {
        return this._getSettings().inputSettings.blocks.find(b => b.id === id);
    }

    // 批量更新块模板
    public batchUpdateBlocks = async (
        blockIds: string[],
        updates: Partial<BlockTemplate>
    ) => {
        await this._updateSettings(draft => {
            let blocks = draft.inputSettings.blocks;
            blockIds.forEach(id => {
                blocks = arrayUtils.updateById(blocks, id, updates);
            });
            draft.inputSettings.blocks = blocks;
        });
    }

    // 批量删除块模板
    public batchDeleteBlocks = async (blockIds: string[]) => {
        await this._updateSettings(draft => {
            draft.inputSettings.blocks = arrayUtils.removeByIds(draft.inputSettings.blocks, blockIds);
            const blockIdSet = new Set(blockIds);
            // 同时删除相关的覆盖配置
            draft.inputSettings.overrides = draft.inputSettings.overrides.filter(o => !blockIdSet.has(o.blockId));
        });
    }
}
