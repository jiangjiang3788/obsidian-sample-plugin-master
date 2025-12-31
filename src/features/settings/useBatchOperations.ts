/**
 * 批量操作Hook
 * 整合批量操作服务，提供简化的API
 */
import { useState, useCallback, useMemo } from 'preact/hooks';
import type { AppStore } from '@/app/AppStore';
import type { ThemeManager } from '@features/settings/ThemeManager';
import { BatchOperationService } from '@/core/theme-matrix/BatchOperationService';
import { parseCellKey } from '@/core/utils/cellKey';
import type { EditorState } from './useThemeMatrixEditor';

// 定义新的参数类型
export type BatchOperation = 
  | 'activate' | 'archive' | 'delete' | 'setIcon'
  | 'setInherit' | 'setOverride' | 'setDisabled';

export interface BatchOperationParams {
  operation: BatchOperation;
  themeIds?: string[];
  cellIds?: string[];
  params?: {
    icon?: string;
  };
}

export interface UseBatchOperationsConfig {
  appStore: AppStore;
  themeManager: ThemeManager;
  onOperationComplete?: () => void;
}

/**
 * 批量操作Hook
 */
export function useBatchOperations({
  appStore,
  themeManager,
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
      // 在这里，我们可以根据 params 调用不同的 appStore 方法
      // 这是简化的实现，实际应使用更健壮的服务层
      const { operation, themeIds, cellIds, params: operationParams } = params;

      if (themeIds && themeIds.length > 0) {
        switch (operation) {
          case 'activate':
            await appStore.batchUpdateThemeStatus(themeIds, 'active');
            break;
          case 'archive':
            await appStore.batchUpdateThemeStatus(themeIds, 'archived');
            break;
          case 'delete':
            if (confirm(`确定要删除 ${themeIds.length} 个主题吗？`)) {
              await appStore.batchDeleteThemes(themeIds);
            }
            break;
          case 'setIcon':
            const icon = prompt('请输入新的图标:', '📁');
            if (icon !== null) {
              await appStore.batchUpdateThemeIcon(themeIds, icon);
            }
            break;
        }
      }

      if (cellIds && cellIds.length > 0) {
        const cells = cellIds
            .map(id => parseCellKey(id))
            .filter((cell): cell is { themeId: string; blockId: string } => cell !== null);

        switch (operation) {
          case 'setInherit':
            await appStore.batchDeleteOverrides(cells);
            break;
          case 'setDisabled':
            await appStore.batchSetOverrideStatus(cells, 'disabled');
            break;
          case 'setOverride':
             // 对于覆盖，可能需要一个模态框来输入通用配置
            console.log('批量覆盖操作需要UI支持');
            break;
        }
      }

      onOperationComplete?.();
    } catch (error) {
      console.error('批量操作失败:', error);
      // 可以在这里添加用户通知
    } finally {
      setIsProcessing(false);
    }
  }, [appStore, isProcessing, onOperationComplete]);
  
  return {
    isProcessing,
    executeBatchOperation,
  };
}
