import type { ThemeDefinition } from '@/core/types/schema';

/** 主题树节点 - 统一结构。 */
export interface ThemeTreeNode {
    /** 节点唯一标识（使用路径作为 ID） */
    id: string;
    /** 节点显示名称（路径最后一段） */
    label: string;
    /** 完整路径 */
    path: string;
    /** 节点层级深度（从 0 开始） */
    depth: number;
    /** 关联的主题 ID（叶子节点有值，虚节点为 null） */
    themeId: string | null;
    /** 关联的完整主题定义（叶子节点有值，虚节点为 null） */
    theme: ThemeDefinition | null;
    /** 父节点 ID（根节点为 null） */
    parentId: string | null;
    /** 子节点列表 */
    children: ThemeTreeNode[];
}

/** 扁平化的树节点（用于搜索/列表展示）。 */
export interface FlatThemeTreeNode extends ThemeTreeNode {
    /** 是否展开（运行时状态） */
    expanded?: boolean;
    /** 是否可见（基于搜索过滤） */
    visible?: boolean;
}

/** 构建选项。 */
export interface BuildThemeTreeOptions {
    /** 排序方式：'path' | 'label' | 'order'，默认 'path' */
    sortBy?: 'path' | 'label' | 'order';
    /** 是否创建虚节点（中间层节点），默认 true */
    createVirtualNodes?: boolean;
}
