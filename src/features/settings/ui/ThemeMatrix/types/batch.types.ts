/**
 * 批量操作相关类型定义
 */
import type { ThemeOverride } from '@core/types/domain/schema';

/**
 * 批量操作类型
 */
export type BatchOperationType = 
  // 主题级操作
  | 'activate'           // 激活主题
  | 'archive'           // 归档主题
  | 'delete'            // 删除主题
  | 'setIcon'           // 批量设置图标
  | 'editMode'          // 批量进入编辑模式
  // Block级操作
  | 'setBlockInherit'   // 设置为继承状态
  | 'setBlockOverride'  // 设置为覆盖状态
  | 'setBlockDisabled'  // 设置为禁用状态
  | 'clearBlockOverrides' // 清除所有覆盖
  | 'applyTemplate';    // 应用配置模板

/**
 * 批量操作参数
 */
export interface BatchOperationParams {
  /** 操作类型 */
  operation: BatchOperationType;
  /** 操作目标 */
  targets: {
    /** 主题ID列表 */
    themeIds?: string[];
    /** Block ID列表 */
    blockIds?: string[];
    /** 单元格列表 */
    cells?: Array<{themeId: string; blockId: string}>;
  };
  /** 操作参数 */
  params?: {
    /** 图标（用于setIcon操作） */
    icon?: string;
    /** 模板（用于applyTemplate操作） */
    template?: Partial<ThemeOverride>;
    /** 状态（用于Block操作） */
    status?: 'enabled' | 'disabled';
  };
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult {
  /** 成功数量 */
  success: number;
  /** 失败数量 */
  failed: number;
  /** 错误信息列表 */
  errors: string[];
}

/**
 * 批量操作配置
 */
export interface BatchOperationConfig {
  /** 操作名称 */
  label: string;
  /** 操作描述 */
  description?: string;
  /** 操作图标 */
  icon?: string;
  /** 是否需要确认 */
  requireConfirm?: boolean;
  /** 是否危险操作 */
  isDangerous?: boolean;
  /** 支持的选择模式 */
  supportedModes: Array<'theme' | 'block' | 'cell'>;
}

/**
 * 批量操作配置映射
 */
export const BATCH_OPERATION_CONFIGS: Record<BatchOperationType, BatchOperationConfig> = {
  // 主题级操作
  activate: {
    label: '激活主题',
    description: '将选中的主题设置为激活状态',
    supportedModes: ['theme']
  },
  archive: {
    label: '归档主题',
    description: '将选中的主题设置为归档状态',
    supportedModes: ['theme']
  },
  delete: {
    label: '删除主题',
    description: '删除选中的主题（仅限非预定义主题）',
    requireConfirm: true,
    isDangerous: true,
    supportedModes: ['theme']
  },
  setIcon: {
    label: '设置图标',
    description: '批量设置主题图标',
    supportedModes: ['theme']
  },
  editMode: {
    label: '编辑模式',
    description: '批量进入编辑模式',
    supportedModes: ['theme']
  },
  // Block级操作
  setBlockInherit: {
    label: '设置为继承',
    description: '使用Block的默认配置',
    supportedModes: ['block', 'cell']
  },
  setBlockOverride: {
    label: '设置为覆盖',
    description: '为选中的Block创建自定义配置',
    supportedModes: ['block', 'cell']
  },
  setBlockDisabled: {
    label: '设置为禁用',
    description: '禁用选中的Block',
    supportedModes: ['block', 'cell']
  },
  clearBlockOverrides: {
    label: '清除覆盖',
    description: '清除所有自定义配置，恢复为继承状态',
    requireConfirm: true,
    supportedModes: ['block', 'cell']
  },
  applyTemplate: {
    label: '应用模板',
    description: '批量应用配置模板',
    supportedModes: ['block', 'cell']
  }
};

/**
 * 获取指定选择模式下可用的操作
 */
export function getAvailableOperations(mode: 'theme' | 'block' | 'cell'): BatchOperationType[] {
  return Object.entries(BATCH_OPERATION_CONFIGS)
    .filter(([_, config]) => config.supportedModes.includes(mode))
    .map(([operation]) => operation as BatchOperationType);
}

/**
 * 判断操作是否为主题级操作
 */
export function isThemeOperation(operation: BatchOperationType): boolean {
  return ['activate', 'archive', 'delete', 'setIcon', 'editMode'].includes(operation);
}

/**
 * 判断操作是否为Block级操作
 */
export function isBlockOperation(operation: BatchOperationType): boolean {
  return !isThemeOperation(operation);
}
