/**
 * 批量操作Hook
 * 整合批量操作服务，提供简化的API
 */
import { useState, useCallback, useMemo } from 'preact/hooks';
import type { AppStore } from '@state/AppStore';
import type { ThemeManager } from '@core/services/ThemeManager';
import { BatchOperationService } from '../services/BatchOperationService';
import type { 
  ThemeMatrixSelection, 
  BatchOperationType, 
  BatchOperationParams 
} from './useThemeMatrixSelection';

export interface UseBatchOperationsConfig {
  appStore: AppStore;
  themeManager: ThemeManager;
  selection: ThemeMatrixSelection;
  onOperationComplete?: () => void;
}

/**
 * 批量操作Hook
 */
export function useBatchOperations({
  appStore,
  themeManager,
  selection,
  onOperationComplete
}: UseBatchOperationsConfig) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 创建批量操作服务实例
  const batchService = useMemo(() => {
    return new BatchOperationService({ appStore, themeManager });
  }, [appStore, themeManager]);
  
  /**
   * 执行批量操作
   */
  const executeBatchOperation = useCallback(async (params: BatchOperationParams) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      await batchService.executeBatchOperation(params);
      onOperationComplete?.();
    } catch (error) {
      console.error('批量操作失败:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [batchService, isProcessing, onOperationComplete]);
  
  /**
   * 批量激活主题
   */
  const batchActivate = useCallback(async () => {
    if (selection.mode !== 'theme' || selection.selectedThemes.size === 0) return;
    
    const targets = Array.from(selection.selectedThemes);
    await executeBatchOperation({
      mode: 'theme',
      operation: 'activate',
      targets
    });
  }, [selection, executeBatchOperation]);
  
  /**
   * 批量归档主题
   */
  const batchArchive = useCallback(async () => {
    if (selection.mode !== 'theme' || selection.selectedThemes.size === 0) return;
    
    const targets = Array.from(selection.selectedThemes);
    await executeBatchOperation({
      mode: 'theme',
      operation: 'archive',
      targets
    });
  }, [selection, executeBatchOperation]);
  
  /**
   * 批量删除主题
   */
  const batchDelete = useCallback(async () => {
    if (selection.mode !== 'theme' || selection.selectedThemes.size === 0) return;
    
    const targets = Array.from(selection.selectedThemes);
    await executeBatchOperation({
      mode: 'theme',
      operation: 'delete',
      targets
    });
  }, [selection, executeBatchOperation]);
  
  /**
   * 批量设置图标
   */
  const batchSetIcon = useCallback(async (icon: string) => {
    if (selection.mode !== 'theme' || selection.selectedThemes.size === 0) return;
    
    const targets = Array.from(selection.selectedThemes);
    await executeBatchOperation({
      mode: 'theme',
      operation: 'setIcon',
      targets,
      params: { icon }
    });
  }, [selection, executeBatchOperation]);
  
  /**
   * 批量设置Block为继承状态
   */
  const batchSetBlockInherit = useCallback(async () => {
    if (selection.mode !== 'block' || selection.selectedBlocks.size === 0) return;
    
    const targets = BatchOperationService.getOperationTargets(selection, 'setInherit');
    await executeBatchOperation({
      mode: 'block',
      operation: 'setInherit',
      targets
    });
  }, [selection, executeBatchOperation]);
  
  /**
   * 批量设置Block为覆盖状态
   */
  const batchSetBlockOverride = useCallback(async (template?: any) => {
    if (selection.mode !== 'block' || selection.selectedBlocks.size === 0) return;
    
    const targets = BatchOperationService.getOperationTargets(selection, 'setOverride');
    await executeBatchOperation({
      mode: 'block',
      operation: 'setOverride',
      targets,
      params: { template }
    });
  }, [selection, executeBatchOperation]);
  
  /**
   * 批量设置Block为禁用状态
   */
  const batchSetBlockDisabled = useCallback(async () => {
    if (selection.mode !== 'block' || selection.selectedBlocks.size === 0) return;
    
    const targets = BatchOperationService.getOperationTargets(selection, 'setDisabled');
    await executeBatchOperation({
      mode: 'block',
      operation: 'setDisabled',
      targets
    });
  }, [selection, executeBatchOperation]);
  
  /**
   * 批量应用模板
   */
  const batchApplyTemplate = useCallback(async (template: any) => {
    if (selection.mode !== 'block' || selection.selectedBlocks.size === 0) return;
    
    const targets = BatchOperationService.getOperationTargets(selection, 'applyTemplate');
    await executeBatchOperation({
      mode: 'block',
      operation: 'applyTemplate',
      targets,
      params: { template }
    });
  }, [selection, executeBatchOperation]);
  
  /**
   * 检查操作是否可用
   */
  const isOperationAvailable = useCallback((operation: BatchOperationType): boolean => {
    return BatchOperationService.isOperationAvailable(selection, operation);
  }, [selection]);
  
  /**
   * 获取可用的操作列表
   */
  const availableOperations = useMemo((): BatchOperationType[] => {
    const allOperations: BatchOperationType[] = [
      'activate', 'archive', 'delete', 'setIcon', 'toggleEdit',
      'setInherit', 'setOverride', 'setDisabled', 'applyTemplate'
    ];
    
    return allOperations.filter(op => isOperationAvailable(op));
  }, [isOperationAvailable]);
  
  return {
    // 状态
    isProcessing,
    availableOperations,
    
    // 通用方法
    executeBatchOperation,
    isOperationAvailable,
    
    // 主题操作
    batchActivate,
    batchArchive,
    batchDelete,
    batchSetIcon,
    
    // Block操作
    batchSetBlockInherit,
    batchSetBlockOverride,
    batchSetBlockDisabled,
    batchApplyTemplate
  };
}
