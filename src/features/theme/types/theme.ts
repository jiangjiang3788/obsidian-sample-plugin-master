// src/core/domain/theme.ts
import { STATUS, SOURCE } from '@/constants';
import { pathUtils } from '@core/utils/pathUtils';
import type { ActiveStatus, SourceType } from '@/shared/types/common';

/**
 * 主题系统的核心接口定义
 * 用于统一管理预定义主题和发现的主题
 */

/**
 * 主题接口
 * 定义了主题的所有属性和元数据
 */
export interface Theme {
  /** 主题唯一标识 */
  id: string;
  
  /** 主题路径（唯一标识），如 "生活/日常" */
  path: string;
  
  /** 显示名称 */
  name: string;
  
  /** 图标（可选） */
  icon?: string;
  
  /** 父主题ID，支持层级结构 */
  parentId: string | null;
  
  /** 主题状态：active表示在快速输入中显示，inactive表示已发现但未激活 */
  status: ActiveStatus;
  
  /** 主题来源：predefined表示预定义的，discovered表示从数据中发现的 */
  source: SourceType;
  
  /** 使用次数，用于排序和推荐 */
  usageCount: number;
  
  /** 最后使用时间（时间戳） */
  lastUsed?: number;
  
  /** 排序权重，数值越小越靠前 */
  order: number;
}

/**
 * 主题统计信息
 */
export interface ThemeStats {
  /** 主题路径 */
  path: string;
  
  /** 使用次数 */
  count: number;
  
  /** 最后使用时间 */
  lastUsed?: number;
}

/**
 * 主题分组，用于UI展示
 */
export interface ThemeGroup {
  /** 分组名称（如"最近使用"、"常用"、"全部"） */
  name: string;
  
  /** 该分组下的主题列表 */
  themes: Theme[];
  
  /** 是否折叠 */
  collapsed?: boolean;
}

/**
 * 主题管理器配置
 */
export interface ThemeManagerConfig {
  /** 最大发现主题数量 */
  maxDiscoveredThemes?: number;
  
  /** 是否自动激活高频主题 */
  autoActivateFrequent?: boolean;
  
  /** 自动激活的使用次数阈值 */
  autoActivateThreshold?: number;
  
  /** 是否保留未使用的发现主题 */
  keepUnusedDiscovered?: boolean;
}

/**
 * 默认主题管理器配置
 */
export const DEFAULT_THEME_CONFIG: ThemeManagerConfig = {
  maxDiscoveredThemes: 100,
  autoActivateFrequent: true,
  autoActivateThreshold: 5,
  keepUnusedDiscovered: false,
};

/**
 * 创建新主题的辅助函数
 */
export function createTheme(
  path: string,
  source: SourceType,
  options?: Partial<Theme>
): Theme {
  const id = options?.id || `theme_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const name = options?.name || pathUtils.getDisplayName(path);
  
  return {
    id,
    path,
    name,
    icon: options?.icon,
    parentId: options?.parentId || null,
    status: options?.status || (source === SOURCE.PREDEFINED ? STATUS.ACTIVE : STATUS.INACTIVE),
    source,
    usageCount: options?.usageCount || 0,
    lastUsed: options?.lastUsed,
    order: options?.order || 999,
  };
}

/**
 * 主题排序函数
 */
export function sortThemes(themes: Theme[]): Theme[] {
  return [...themes].sort((a, b) => {
    // 首先按状态排序（active优先）
    if (a.status !== b.status) {
      return a.status === STATUS.ACTIVE ? -1 : 1;
    }
    
    // 然后按使用次数降序
    if (a.usageCount !== b.usageCount) {
      return b.usageCount - a.usageCount;
    }
    
    // 然后按最后使用时间降序
    if (a.lastUsed !== undefined && b.lastUsed !== undefined) {
      return b.lastUsed - a.lastUsed;
    } else if (a.lastUsed !== undefined) {
      return -1;
    } else if (b.lastUsed !== undefined) {
      return 1;
    }
    
    // 然后按order升序
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    
    // 最后按名称字母顺序
    return a.name.localeCompare(b.name);
  });
}
