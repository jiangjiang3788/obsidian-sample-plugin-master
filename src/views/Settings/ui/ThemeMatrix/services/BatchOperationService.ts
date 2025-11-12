/**
 * 批量操作服务
 * 处理主题矩阵的批量操作逻辑
 */
import type { AppStore } from '@core/stores/AppStore';
import type { ThemeManager } from '@features/theme/services/ThemeManager';
import type { 
  ThemeMatrixSelection, 
  BatchOperationType, 
  BatchOperationParams 
} from '../hooks/useThemeMatrixSelection';
import type { ThemeDefinition, ThemeOverride } from '@/lib/types/domain/schema';

export interface BatchOperationConfig {
  appStore: AppStore;
  themeManager: ThemeManager;
}

/**
 * 批量操作服务
 */
export class BatchOperationService {
  private appStore: AppStore;
  private themeManager: ThemeManager;

  constructor(config: BatchOperationConfig) {
    this.appStore = config.appStore;
    this.themeManager = config.themeManager;
  }

  /**
   * 执行批量操作
   */
  async executeBatchOperation(params: BatchOperationParams): Promise<void> {
    const { mode, operation, targets } = params;

    if (mode === 'theme') {
      await this.executeThemeOperation(operation, targets, params.params);
    } else if (mode === 'block') {
      await this.executeBlockOperation(operation, targets, params.params);
    }
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
      case 'toggleEdit':
        // 这个操作是UI状态，不需要持久化
        break;
      default:
        throw new Error(`不支持的主题操作: ${operation}`);
    }
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
      case 'setInherit':
        await this.batchSetBlockInherit(blockConfigs);
        break;
      case 'setOverride':
        await this.batchSetBlockOverride(blockConfigs, params?.template);
        break;
      case 'setDisabled':
        await this.batchSetBlockDisabled(blockConfigs);
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
  static getOperationTargets(
    selection: ThemeMatrixSelection,
    operation: BatchOperationType
  ): string[] {
    if (selection.mode === 'theme') {
      return Array.from(selection.selectedThemes);
    } else if (selection.mode === 'block') {
      // 将Block选择转换为 themeId:blockId 格式
      const targets: string[] = [];
      for (const [blockId, themeIds] of selection.selectedBlocks) {
        for (const themeId of themeIds) {
          targets.push(`${themeId}:${blockId}`);
        }
      }
      return targets;
    }
    return [];
  }

  /**
   * 检查操作是否可用
   */
  static isOperationAvailable(
    selection: ThemeMatrixSelection,
    operation: BatchOperationType
  ): boolean {
    if (selection.mode === 'theme') {
      const themeOperations: BatchOperationType[] = [
        'activate', 'archive', 'delete', 'setIcon', 'toggleEdit'
      ];
      return themeOperations.includes(operation) && selection.selectedThemes.size > 0;
    } else if (selection.mode === 'block') {
      const blockOperations: BatchOperationType[] = [
        'setInherit', 'setOverride', 'setDisabled', 'applyTemplate'
      ];
      return blockOperations.includes(operation) && selection.selectedBlocks.size > 0;
    }
    return false;
  }
}
