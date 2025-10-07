// src/core/domain/theme.ts

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
  status: 'active' | 'inactive';
  
  /** 主题来源：predefined表示预定义的，discovered表示从数据中发现的 */
  source: 'predefined' | 'discovered';
  
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
  source: 'predefined' | 'discovered',
  options?: Partial<Theme>
): Theme {
  const id = options?.id || `theme_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const name = options?.name || path.split('/').pop() || path;
  
  return {
    id,
    path,
    name,
    icon: options?.icon,
    parentId: options?.parentId || null,
    status: source === 'predefined' ? 'active' : 'inactive',
    source,
    usageCount: options?.usageCount || 0,
    lastUsed: options?.lastUsed,
    order: options?.order || 999,
  };
}

/**
 * 从路径解析主题层级
 * 例如："生活/日常/购物" -> ["生活", "生活/日常", "生活/日常/购物"]
 */
export function parseThemeHierarchy(path: string): string[] {
  const parts = path.split('/').filter(p => p.trim());
  const hierarchy: string[] = [];
  
  for (let i = 0; i < parts.length; i++) {
    hierarchy.push(parts.slice(0, i + 1).join('/'));
  }
  
  return hierarchy;
}

/**
 * 检查主题路径是否有效
 */
export function isValidThemePath(path: string): boolean {
  if (!path || typeof path !== 'string') return false;
  
  // 移除首尾空格
  const trimmed = path.trim();
  
  // 检查是否为空
  if (trimmed.length === 0) return false;
  
  // 检查是否包含非法字符
  const invalidChars = ['#', '@', '!', '$', '%', '^', '&', '*', '(', ')', '[', ']', '{', '}', '\\', '|', '`', '~'];
  if (invalidChars.some(char => trimmed.includes(char))) return false;
  
  // 检查路径段是否有效
  const parts = trimmed.split('/');
  return parts.every(part => part.trim().length > 0);
}

/**
 * 主题排序函数
 */
export function sortThemes(themes: Theme[]): Theme[] {
  return themes.sort((a, b) => {
    // 首先按状态排序（active优先）
    if (a.status !== b.status) {
      return a.status === 'active' ? -1 : 1;
    }
    
    // 然后按使用次数降序
    if (a.usageCount !== b.usageCount) {
      return b.usageCount - a.usageCount;
    }
    
    // 然后按最后使用时间降序
    if (a.lastUsed && b.lastUsed) {
      return b.lastUsed - a.lastUsed;
    }
    
    // 然后按order升序
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    
    // 最后按名称字母顺序
    return a.name.localeCompare(b.name);
  });
}
