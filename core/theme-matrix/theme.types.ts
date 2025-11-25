/**
 * 主题相关类型定义
 */
import { ThemeDefinition, ThemeOverride } from '@/core/types/schema';
import { ActiveStatus, SourceType } from '@shared/types/common';

/**
 * 扩展的主题定义，包含运行时状态和元数据
 */
export interface ExtendedTheme extends ThemeDefinition {
    /** 主题状态：激活或归档 */
    status?: ActiveStatus;
    /** 主题来源：预定义或发现的 */
    source?: SourceType;
    /** 使用次数统计 */
    usageCount?: number;
    /** 最后使用时间戳 */
    lastUsed?: number;
    /** 父主题ID，用于树形结构 */
    parentId?: string | null;
}

/**
 * 主题树节点，用于构建树形展示结构
 */
export interface ThemeTreeNode {
    /** 主题数据 */
    theme: ExtendedTheme;
    /** 子节点列表 */
    children: ThemeTreeNode[];
    /** 展开状态 */
    expanded: boolean;
    /** 节点层级，用于缩进显示 */
    level: number;
}

/**
 * 主题覆盖映射键
 */
export type ThemeOverrideKey = `${string}:${string}`;

/**
 * 主题上下文菜单数据
 */
export interface ThemeContextMenuData {
    /** 鼠标位置X坐标 */
    x: number;
    /** 鼠标位置Y坐标 */
    y: number;
    /** 关联的主题 */
    theme: ExtendedTheme;
}
