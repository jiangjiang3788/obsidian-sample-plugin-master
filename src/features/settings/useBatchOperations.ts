/**
 * 批量操作Hook
 * 整合批量操作服务，提供简化的API
 * 
 * P1: 通过 UseCases 调用批量操作，禁止直接访问 appStore
 */
import { useState, useCallback } from 'preact/hooks';
import { devWarn, parseCellKey } from '@core/public';
import { useUseCases } from '@/app/public';

// 定义新的参数类型
export type BatchOperation = 
  | 'activate' | 'inactive' | 'delete' | 'setIcon'
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
  onOperationComplete?: () => void;
}

/**
 * 批量操作Hook
 * P1: 使用 useUseCases() 获取 UseCases，不接收 appStore
 */
export function useBatchOperations({
  onOperationComplete
}: UseBatchOperationsConfig = {}) {
  const useCases = useUseCases();
  const [isProcessing, setIsProcessing] = useState(false);
  
  /**
   * 执行批量操作
   * P1: 所有操作通过 useCases.theme.* 调用
   */
  const executeBatchOperation = useCallback(async (params: BatchOperationParams) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const { operation, themeIds, cellIds } = params;

      // 主题批量操作
      if (themeIds && themeIds.length > 0) {
        switch (operation) {
          case 'activate':
            await useCases.theme.batchUpdateThemeStatus(themeIds, 'active');
            break;
          case 'inactive':
            await useCases.theme.batchUpdateThemeStatus(themeIds, 'inactive');
            break;
          case 'delete':
            if (confirm(`确定要删除 ${themeIds.length} 个主题吗？`)) {
              await useCases.theme.batchDeleteThemes(themeIds);
            }
            break;
          case 'setIcon':
            const icon = prompt('请输入新的图标:', '📁');
            if (icon !== null) {
              await useCases.theme.batchUpdateThemeIcon(themeIds, icon);
            }
            break;
        }
      }

      // 单元格批量操作
      if (cellIds && cellIds.length > 0) {
        const cells = cellIds
            .map(id => parseCellKey(id))
            .filter((cell): cell is { themeId: string; blockId: string } => cell !== null);

        switch (operation) {
          case 'setInherit':
            await useCases.theme.batchDeleteOverrides(cells);
            break;
          case 'setDisabled':
            await useCases.theme.batchSetOverrideStatus(cells, 'disabled');
            break;
          case 'setOverride':
            // 对于覆盖，可能需要一个模态框来输入通用配置
            devWarn('批量覆盖操作需要 UI 支持');
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
  }, [useCases, isProcessing, onOperationComplete]);
  
  return {
    isProcessing,
    executeBatchOperation,
  };
}
