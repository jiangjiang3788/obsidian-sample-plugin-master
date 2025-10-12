/**
 * 批量操作管理Hook
 */
import { useState, useCallback, useMemo } from 'preact/hooks';
import { Notice } from 'obsidian';
import type { AppStore } from '@state/AppStore';
import { BatchOperationService } from '../services/BatchOperationService';
import type { 
    BatchOperationType,
    BatchOperationParams,
    BatchOperationResult,
    BatchOperationConfig
} from '../types/batch.types';
import { 
    BATCH_OPERATION_CONFIGS,
    getAvailableOperations 
} from '../types/batch.types';
import type { SelectionState } from '../types/selection.types';
import { getTargetsFromSelection } from '../types/selection.types';
import type { ThemeManager } from '@core/services/ThemeManager';

interface UseBatchOperationsProps {
    appStore: AppStore;
    themeManager: ThemeManager;
    selectionState: SelectionState;
    onOperationComplete?: () => void;
}

/**
 * 批量操作管理Hook
 */
export function useBatchOperations({
    appStore,
    themeManager,
    selectionState,
    onOperationComplete
}: UseBatchOperationsProps) {
    // 批量操作服务
    const batchService = useMemo(
        () => new BatchOperationService(appStore, themeManager),
        [appStore, themeManager]
    );
    
    // 操作状态
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastResult, setLastResult] = useState<BatchOperationResult | null>(null);
    
    // 获取当前模式下可用的操作
    const availableOperations = useMemo(
        () => getAvailableOperations(selectionState.mode),
        [selectionState.mode]
    );
    
    /**
     * 执行批量操作
     */
    const executeBatchOperation = useCallback(async (
        operation: BatchOperationType,
        params?: any
    ) => {
        // 构建操作参数
        const targets = getTargetsFromSelection(selectionState);
        const operationParams: BatchOperationParams = {
            operation,
            targets,
            params
        };
        
        // 验证参数
        const errors = batchService.validateParams(operationParams);
        if (errors.length > 0) {
            new Notice(`操作失败: ${errors.join(', ')}`);
            return null;
        }
        
        setIsProcessing(true);
        
        try {
            // 执行操作
            const result = await batchService.executeBatchOperation(operationParams);
            setLastResult(result);
            
            // 显示结果通知
            if (result.success > 0) {
                new Notice(`批量操作成功: ${result.success} 项已处理`);
            }
            if (result.failed > 0) {
                new Notice(`批量操作失败: ${result.failed} 项处理失败`);
                console.error('批量操作错误:', result.errors);
            }
            
            // 触发完成回调
            if (onOperationComplete) {
                onOperationComplete();
            }
            
            return result;
        } catch (error) {
            console.error('批量操作异常:', error);
            new Notice(`批量操作异常: ${error}`);
            return null;
        } finally {
            setIsProcessing(false);
        }
    }, [selectionState, batchService, onOperationComplete]);
    
    /**
     * 批量激活主题
     */
    const batchActivate = useCallback(async () => {
        return executeBatchOperation('activate');
    }, [executeBatchOperation]);
    
    /**
     * 批量归档主题
     */
    const batchArchive = useCallback(async () => {
        return executeBatchOperation('archive');
    }, [executeBatchOperation]);
    
    /**
     * 批量删除主题
     */
    const batchDelete = useCallback(async () => {
        const confirmed = confirm('确定要删除选中的主题吗？此操作不可恢复。');
        if (!confirmed) return null;
        
        return executeBatchOperation('delete');
    }, [executeBatchOperation]);
    
    /**
     * 批量设置图标
     */
    const batchSetIcon = useCallback(async (icon: string) => {
        return executeBatchOperation('setIcon', { icon });
    }, [executeBatchOperation]);
    
    /**
     * 批量设置Block为继承
     */
    const batchSetBlockInherit = useCallback(async () => {
        return executeBatchOperation('setBlockInherit');
    }, [executeBatchOperation]);
    
    /**
     * 批量设置Block为覆盖
     */
    const batchSetBlockOverride = useCallback(async () => {
        return executeBatchOperation('setBlockOverride');
    }, [executeBatchOperation]);
    
    /**
     * 批量设置Block为禁用
     */
    const batchSetBlockDisabled = useCallback(async () => {
        return executeBatchOperation('setBlockDisabled');
    }, [executeBatchOperation]);
    
    /**
     * 批量清除Block覆盖
     */
    const batchClearBlockOverrides = useCallback(async () => {
        const confirmed = confirm('确定要清除选中的Block覆盖配置吗？');
        if (!confirmed) return null;
        
        return executeBatchOperation('clearBlockOverrides');
    }, [executeBatchOperation]);
    
    /**
     * 批量应用模板
     */
    const batchApplyTemplate = useCallback(async (template: any) => {
        return executeBatchOperation('applyTemplate', { template });
    }, [executeBatchOperation]);
    
    /**
     * 获取操作配置
     */
    const getOperationConfig = useCallback((
        operation: BatchOperationType
    ): BatchOperationConfig => {
        return BATCH_OPERATION_CONFIGS[operation];
    }, []);
    
    /**
     * 检查操作是否可用
     */
    const isOperationAvailable = useCallback((
        operation: BatchOperationType
    ): boolean => {
        const config = BATCH_OPERATION_CONFIGS[operation];
        return config.supportedModes.includes(selectionState.mode);
    }, [selectionState.mode]);
    
    /**
     * 获取选择数量描述
     */
    const getSelectionDescription = useCallback((): string => {
        const targets = getTargetsFromSelection(selectionState);
        const parts: string[] = [];
        
        if (targets.themeIds && targets.themeIds.length > 0) {
            parts.push(`${targets.themeIds.length} 个主题`);
        }
        if (targets.blockIds && targets.blockIds.length > 0) {
            parts.push(`${targets.blockIds.length} 个Block`);
        }
        if (targets.cells && targets.cells.length > 0) {
            parts.push(`${targets.cells.length} 个单元格`);
        }
        
        return parts.join(', ') || '无选择';
    }, [selectionState]);
    
    return {
        // 状态
        isProcessing,
        lastResult,
        availableOperations,
        
        // 通用方法
        executeBatchOperation,
        getOperationConfig,
        isOperationAvailable,
        getSelectionDescription,
        
        // 快捷方法
        batchActivate,
        batchArchive,
        batchDelete,
        batchSetIcon,
        batchSetBlockInherit,
        batchSetBlockOverride,
        batchSetBlockDisabled,
        batchClearBlockOverrides,
        batchApplyTemplate
    };
}
