/**
 * 批量操作服务
 * 处理主题矩阵的批量操作逻辑
 */
import type { AppStore } from '@state/AppStore';
import type { ThemeManager } from '@core/services/ThemeManager';
import type { 
    BatchOperationParams, 
    BatchOperationResult,
    BatchOperationType 
} from '../types/batch.types';
import type { ThemeOverride } from '@core/domain/schema';
import { generateId } from '@core/utils/array';

/**
 * 批量操作服务
 */
export class BatchOperationService {
    constructor(
        private appStore: AppStore,
        private themeManager: ThemeManager
    ) {}

    /**
     * 执行批量操作
     */
    async executeBatchOperation(
        params: BatchOperationParams
    ): Promise<BatchOperationResult> {
        switch (params.operation) {
            // 主题级操作
            case 'activate':
                return this.batchActivateThemes(params);
            case 'archive':
                return this.batchArchiveThemes(params);
            case 'delete':
                return this.batchDeleteThemes(params);
            case 'setIcon':
                return this.batchSetIcon(params);
            case 'editMode':
                return this.batchEnableEditMode(params);
            // Block级操作
            case 'setBlockInherit':
            case 'setBlockOverride':
            case 'setBlockDisabled':
                return this.batchSetBlockStatus(params);
            case 'clearBlockOverrides':
                return this.batchClearBlockOverrides(params);
            case 'applyTemplate':
                return this.batchApplyTemplate(params);
            default:
                return {
                    success: 0,
                    failed: 1,
                    errors: [`Unknown operation: ${params.operation}`]
                };
        }
    }

    /**
     * 批量激活主题
     */
    private async batchActivateThemes(
        params: BatchOperationParams
    ): Promise<BatchOperationResult> {
        const { themeIds } = params.targets;
        if (!themeIds || themeIds.length === 0) {
            return { success: 0, failed: 0, errors: [] };
        }

        const result: BatchOperationResult = {
            success: 0,
            failed: 0,
            errors: []
        };

        const themes = this.appStore.getState().settings.inputSettings.themes;
        
        for (const themeId of themeIds) {
            try {
                const theme = themes.find(t => t.id === themeId);
                if (theme) {
                    this.themeManager.activateTheme(theme.path);
                    result.success++;
                } else {
                    result.failed++;
                    result.errors.push(`Theme ${themeId} not found`);
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`Failed to activate theme ${themeId}: ${error}`);
            }
        }

        return result;
    }

    /**
     * 批量归档主题
     */
    private async batchArchiveThemes(
        params: BatchOperationParams
    ): Promise<BatchOperationResult> {
        const { themeIds } = params.targets;
        if (!themeIds || themeIds.length === 0) {
            return { success: 0, failed: 0, errors: [] };
        }

        const result: BatchOperationResult = {
            success: 0,
            failed: 0,
            errors: []
        };

        const themes = this.appStore.getState().settings.inputSettings.themes;
        
        for (const themeId of themeIds) {
            try {
                const theme = themes.find(t => t.id === themeId);
                if (theme) {
                    this.themeManager.deactivateTheme(theme.path);
                    result.success++;
                } else {
                    result.failed++;
                    result.errors.push(`Theme ${themeId} not found`);
                }
            } catch (error) {
                result.failed++;
                result.errors.push(`Failed to archive theme ${themeId}: ${error}`);
            }
        }

        return result;
    }

    /**
     * 批量删除主题
     */
    private async batchDeleteThemes(
        params: BatchOperationParams
    ): Promise<BatchOperationResult> {
        const { themeIds } = params.targets;
        if (!themeIds || themeIds.length === 0) {
            return { success: 0, failed: 0, errors: [] };
        }

        const result: BatchOperationResult = {
            success: 0,
            failed: 0,
            errors: []
        };

        try {
            await this.appStore.batchDeleteThemes(themeIds);
            result.success = themeIds.length;
        } catch (error) {
            result.failed = themeIds.length;
            result.errors.push(`Failed to delete themes: ${error}`);
        }

        return result;
    }

    /**
     * 批量设置图标
     */
    private async batchSetIcon(
        params: BatchOperationParams
    ): Promise<BatchOperationResult> {
        const { themeIds } = params.targets;
        const { icon } = params.params || {};
        
        if (!themeIds || themeIds.length === 0 || icon === undefined) {
            return { 
                success: 0, 
                failed: 0, 
                errors: icon === undefined ? ['Icon parameter is required'] : [] 
            };
        }

        const result: BatchOperationResult = {
            success: 0,
            failed: 0,
            errors: []
        };

        try {
            await this.appStore.batchUpdateThemes(themeIds, { icon });
            result.success = themeIds.length;
        } catch (error) {
            result.failed = themeIds.length;
            result.errors.push(`Failed to set icon: ${error}`);
        }

        return result;
    }

    /**
     * 批量启用编辑模式
     */
    private async batchEnableEditMode(
        params: BatchOperationParams
    ): Promise<BatchOperationResult> {
        // 编辑模式是UI状态，不需要持久化
        // 这里只返回成功，实际的UI状态由组件管理
        const { themeIds } = params.targets;
        if (!themeIds || themeIds.length === 0) {
            return { success: 0, failed: 0, errors: [] };
        }

        return {
            success: themeIds.length,
            failed: 0,
            errors: []
        };
    }

    /**
     * 批量设置Block状态
     */
    private async batchSetBlockStatus(
        params: BatchOperationParams
    ): Promise<BatchOperationResult> {
        const { operation, targets } = params;
        const status = this.getStatusFromOperation(operation);
        
        if (!targets.cells || targets.cells.length === 0) {
            return { success: 0, failed: 0, errors: [] };
        }

        const result: BatchOperationResult = {
            success: 0,
            failed: 0,
            errors: []
        };

        try {
            if (status === 'inherit') {
                // 删除覆盖以实现继承
                await this.appStore.batchDeleteOverrides(targets.cells);
                result.success = targets.cells.length;
            } else {
                // 创建或更新覆盖
                const overrides: Array<Omit<ThemeOverride, 'id'>> = targets.cells.map(cell => ({
                    themeId: cell.themeId,
                    blockId: cell.blockId,
                    status: status as 'enabled' | 'disabled',
                    outputTemplate: '',
                    targetFile: '',
                    appendUnderHeader: ''
                }));
                
                await this.appStore.batchUpsertOverrides(overrides);
                result.success = overrides.length;
            }
        } catch (error) {
            result.failed = targets.cells.length;
            result.errors.push(`Failed to set block status: ${error}`);
        }

        return result;
    }

    /**
     * 批量清除Block覆盖
     */
    private async batchClearBlockOverrides(
        params: BatchOperationParams
    ): Promise<BatchOperationResult> {
        const { cells } = params.targets;
        if (!cells || cells.length === 0) {
            return { success: 0, failed: 0, errors: [] };
        }

        const result: BatchOperationResult = {
            success: 0,
            failed: 0,
            errors: []
        };

        try {
            await this.appStore.batchDeleteOverrides(cells);
            result.success = cells.length;
        } catch (error) {
            result.failed = cells.length;
            result.errors.push(`Failed to clear overrides: ${error}`);
        }

        return result;
    }

    /**
     * 批量应用模板
     */
    private async batchApplyTemplate(
        params: BatchOperationParams
    ): Promise<BatchOperationResult> {
        const { cells } = params.targets;
        const { template } = params.params || {};
        
        if (!cells || cells.length === 0 || !template) {
            return { 
                success: 0, 
                failed: 0, 
                errors: !template ? ['Template parameter is required'] : [] 
            };
        }

        const result: BatchOperationResult = {
            success: 0,
            failed: 0,
            errors: []
        };

        try {
            const overrides: Array<Omit<ThemeOverride, 'id'>> = cells.map(cell => ({
                themeId: cell.themeId,
                blockId: cell.blockId,
                status: template.status || 'enabled',
                outputTemplate: template.outputTemplate || '',
                targetFile: template.targetFile || '',
                appendUnderHeader: template.appendUnderHeader || '',
                fields: template.fields
            }));
            
            await this.appStore.batchUpsertOverrides(overrides);
            result.success = overrides.length;
        } catch (error) {
            result.failed = cells.length;
            result.errors.push(`Failed to apply template: ${error}`);
        }

        return result;
    }

    /**
     * 从操作类型获取状态
     */
    private getStatusFromOperation(
        operation: BatchOperationType
    ): 'inherit' | 'enabled' | 'disabled' {
        switch (operation) {
            case 'setBlockInherit':
                return 'inherit';
            case 'setBlockOverride':
                return 'enabled';
            case 'setBlockDisabled':
                return 'disabled';
            default:
                return 'enabled';
        }
    }

    /**
     * 验证操作参数
     */
    validateParams(params: BatchOperationParams): string[] {
        const errors: string[] = [];

        // 验证操作类型
        if (!params.operation) {
            errors.push('Operation type is required');
        }

        // 验证目标
        const { themeIds, blockIds, cells } = params.targets;
        const hasTargets = 
            (themeIds && themeIds.length > 0) ||
            (blockIds && blockIds.length > 0) ||
            (cells && cells.length > 0);
        
        if (!hasTargets) {
            errors.push('At least one target is required');
        }

        // 验证特定操作的参数
        switch (params.operation) {
            case 'setIcon':
                if (!params.params?.icon) {
                    errors.push('Icon parameter is required for setIcon operation');
                }
                break;
            case 'applyTemplate':
                if (!params.params?.template) {
                    errors.push('Template parameter is required for applyTemplate operation');
                }
                break;
        }

        return errors;
    }
}
