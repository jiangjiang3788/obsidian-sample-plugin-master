/**
 * 批量操作服务
 * 处理主题矩阵的批量操作逻辑
 */
import type { AppStore } from '@/app/ppStore';
import type { ThemeManager } from '@features/theme/ThemeManager';
import type { 
  BatchOperationType, 
  BatchOperationParams,
  BatchOperationResult
} from '@core/theme-matrix/types';
import type { ThemeDefinition, ThemeOverride } from '@/core/types/schema';
import type { SelectionState } from '@core/theme-matrix/types';

export interface BatchOperationServiceConfig {
  appStore: AppStore;
  themeManager: ThemeManager;
}

/**
 * 批量操作服务
 */
export class BatchOperationService {
  private appStore: AppStore;
  private themeManager: ThemeManager;

  constructor(config: BatchOperationServiceConfig) {
    this.appStore = config.appStore;
    this.themeManager = config.themeManager;
  }

  /**
   * 执行批量操作
   */
  async executeBatchOperation(params: BatchOperationParams): Promise<BatchOperationResult> {
    const { operation, targets } = params;

    const result: BatchOperationResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    try {
      if (targets.themeIds && targets.themeIds.length > 0) {
        await this.executeThemeOperation(operation, targets.themeIds, params.params);
        result.success = targets.themeIds.length;
      }

      if (targets.cells && targets.cells.length > 0) {
        await this.executeCellOperation(operation, targets.cells, params.params);
        result.success += targets.cells.length;
      }

      if (targets.blockIds && targets.blockIds.length > 0) {
        await this.executeBlockOperation(operation, targets.blockIds, params.params);
        result.success += targets.blockIds.length;
      }
    } catch (error) {
      const totalTargets = (targets.themeIds?.length || 0) + (targets.cells?.length || 0) + (targets.blockIds?.length || 0);
      result.failed = totalTargets;
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * 执行主题相关的批量操作
   */
  private async executeThemeOperation(
    operation: BatchOperationType,
    themeIds: string[],
    params?: any
  ): Promise<void> {
    switch (operation) {
      case 'activate':
        await this.batchActivateThemes(themeIds);
        break;
      case 'archive':
        await this.batchArchiveThemes(themeIds);
        break;
      case 'delete':
        await this.batchDeleteThemes(themeIds);
        break;
      case 'setIcon':
        if (params?.icon) {
          await this.batchSetThemeIcon(themeIds, params.icon);
        }
        break;
      case 'editMode':
        // 这个操作是UI状态，不需要持久化
        break;
      default:
        throw new Error(`不支持的主题操作: ${operation}`);
    }
  }

  /**
   * 执行单元格相关的批量操作
   */
  private async executeCellOperation(
    operation: BatchOperationType,
    cells: Array<{themeId: string; blockId: string}>,
    params?: any
  ): Promise<void> {
    // 将单元格转换为 blockId:themeId 格式
    const blockConfigs = cells.map(cell => `${cell.themeId}:${cell.blockId}`);
    return this.executeBlockOperation(operation, blockConfigs, params);
  }

  /**
   * 执行Block相关的批量操作
   */
  private async executeBlockOperation(
    operation: BatchOperationType,
    blockConfigs: string[], // 这里应该是 blockId:themeId 的组合
    params?: any
  ): Promise<void> {
    switch (operation) {
      case 'setBlockInherit':
        await this.batchSetBlockInherit(blockConfigs);
        break;
      case 'setBlockOverride':
        await this.batchSetBlockOverride(blockConfigs, params?.template);
        break;
      case 'setBlockDisabled':
        await this.batchSetBlockDisabled(blockConfigs);
        break;
      case 'clearBlockOverrides':
        await this.batchSetBlockInherit(blockConfigs); // 清除覆盖就是设置为继承
        break;
      case 'applyTemplate':
        if (params?.template) {
          await this.batchApplyTemplate(blockConfigs, params.template);
        }
        break;
      default:
        throw new Error(`不支持的Block操作: ${operation}`);
    }
  }

  /**
   * 批量激活主题
   */
  async batchActivateThemes(themeIds: string[]): Promise<void> {
    const { themes } = this.appStore.getSettings().inputSettings;
    
    for (const themeId of themeIds) {
      const theme = themes.find(t => t.id === themeId);
      if (theme) {
        await this.themeManager.activateTheme(theme.path);
      }
    }
  }

  /**
   * 批量归档主题
   */
  async batchArchiveThemes(themeIds: string[]): Promise<void> {
    const { themes } = this.appStore.getSettings().inputSettings;
    
    for (const themeId of themeIds) {
      const theme = themes.find(t => t.id === themeId);
      if (theme) {
        await this.themeManager.deactivateTheme(theme.path);
      }
    }
  }

  /**
   * 批量删除主题
   */
  async batchDeleteThemes(themeIds: string[]): Promise<void> {
    await this.appStore.batchDeleteThemes(themeIds);
  }

  /**
   * 批量设置主题图标
   */
  async batchSetThemeIcon(themeIds: string[], icon: string): Promise<void> {
    await this.appStore.batchUpdateThemes(themeIds, { icon });
  }

  /**
   * 批量设置Block为继承状态（删除覆盖）
   */
  async batchSetBlockInherit(blockConfigs: string[]): Promise<void> {
    const deletions: Array<{blockId: string; themeId: string}> = [];
    
    for (const config of blockConfigs) {
      const [themeId, blockId] = config.split(':');
      if (themeId && blockId) {
        deletions.push({ blockId, themeId });
      }
    }
    
    if (deletions.length > 0) {
      await this.appStore.batchDeleteOverrides(deletions);
    }
  }

  /**
   * 批量设置Block为覆盖状态
   */
  async batchSetBlockOverride(
    blockConfigs: string[], 
    template?: Partial<ThemeOverride>
  ): Promise<void> {
    const overrides: Array<Omit<ThemeOverride, 'id'>> = [];
    
    for (const config of blockConfigs) {
      const [themeId, blockId] = config.split(':');
      if (themeId && blockId) {
        overrides.push({
          themeId,
          blockId,
          disabled: false,
          ...template
        });
      }
    }
    
    if (overrides.length > 0) {
      await this.appStore.batchUpsertOverrides(overrides);
    }
  }

  /**
   * 批量设置Block为禁用状态
   */
  async batchSetBlockDisabled(blockConfigs: string[]): Promise<void> {
    const overrides: Array<Omit<ThemeOverride, 'id'>> = [];
    
    for (const config of blockConfigs) {
      const [themeId, blockId] = config.split(':');
      if (themeId && blockId) {
        overrides.push({
          themeId,
          blockId,
          disabled: true
        });
      }
    }
    
    if (overrides.length > 0) {
      await this.appStore.batchUpsertOverrides(overrides);
    }
  }

  /**
   * 批量应用模板
   */
  async batchApplyTemplate(
    blockConfigs: string[], 
    template: Partial<ThemeOverride>
  ): Promise<void> {
    await this.batchSetBlockOverride(blockConfigs, template);
  }

  /**
   * 从选择状态获取批量操作的目标
   */
  static getOperationTargetsFromSelection(
    selection: SelectionState
  ): {
    themeIds?: string[];
    blockIds?: string[];
    cells?: Array<{ themeId: string; blockId: string }>;
  } {
    const targets: {
      themeIds?: string[];
      blockIds?: string[];
      cells?: Array<{ themeId: string; blockId: string }>;
    } = {};

    if (selection.selectedThemes.size > 0) {
      targets.themeIds = Array.from(selection.selectedThemes);
    }

    if (selection.selectedBlocks.size > 0) {
      targets.blockIds = Array.from(selection.selectedBlocks);
    }

    if (selection.selectedCells.size > 0) {
      targets.cells = Array.from(selection.selectedCells)
        .map(cellKey => {
          const [themeId, blockId] = cellKey.split(':');
          return { themeId, blockId };
        })
        .filter(cell => cell.themeId && cell.blockId);
    }

    return targets;
  }
}
