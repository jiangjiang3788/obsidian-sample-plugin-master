/**
 * ThemeMatrix 主题树工具（领域层）
 *
 * 说明：
 * - ThemeMatrix 的 UI 展开/缩进属于“展示态”，不应进入 core 类型。
 * - 本文件只保留“主题层级关系”的纯算法（供 selection/delete 等计算使用）。
 * - 构树逻辑复用统一的 ThemePathTreeBuilder（core/theme/ThemeTreeBuilder）。
 */
import type { ExtendedTheme, ThemeTreeNode } from '@core/theme-matrix';
import {
  ThemeTreeBuilder as UnifiedThemeTreeBuilder,
  ThemeTreeNode as UnifiedThemeTreeNode,
} from '@/core/theme/ThemeTreeBuilder';

/**
 * 构建主题树（仅真实主题节点；无 UI 展开态/层级态）
 *
 * - createVirtualNodes=false：只让“真实主题”作为节点，避免 path 虚节点混进 ThemeMatrix 的领域逻辑。
 */
export function buildThemeTree(themes: ExtendedTheme[]): ThemeTreeNode[] {
  const unifiedTree = UnifiedThemeTreeBuilder.buildTree(themes, { createVirtualNodes: false });

  const convertNodes = (nodes: UnifiedThemeTreeNode[]): ThemeTreeNode[] => {
    const out: ThemeTreeNode[] = [];
    for (const node of nodes) {
      if (node.theme) {
        out.push({
          theme: node.theme as ExtendedTheme,
          children: convertNodes(node.children),
        });
      } else {
        // 虚节点：向上提升子节点（理论上 createVirtualNodes=false 时不会出现）
        out.push(...convertNodes(node.children));
      }
    }
    return out;
  };

  return convertNodes(unifiedTree);
}

/**
 * 分组主题节点为激活和归档（兼容）
 *
 * NOTE: 目前项目只有 active/inactive 两态；
 *       这里按 node.theme.status === 'active' 分组，其余视为 archived/inactive。
 */
export function groupThemesByStatus(themeTree: ThemeTreeNode[]): {
  activeThemes: ThemeTreeNode[];
  archivedThemes: ThemeTreeNode[];
} {
  const active: ThemeTreeNode[] = [];
  const archived: ThemeTreeNode[] = [];

  themeTree.forEach(node => {
    if (node.theme.status === 'active') {
      active.push(node);
    } else {
      archived.push(node);
    }
  });

  return { activeThemes: active, archivedThemes: archived };
}

/**
 * 获取主题的所有子孙节点ID（包含自身）
 */
export function getDescendantIds(node: ThemeTreeNode): string[] {
  const ids: string[] = [node.theme.id];

  node.children.forEach(child => {
    ids.push(...getDescendantIds(child));
  });

  return ids;
}

/**
 * 在树中查找节点
 */
export function findNodeInTree(tree: ThemeTreeNode[], themeId: string): ThemeTreeNode | null {
  for (const node of tree) {
    if (node.theme.id === themeId) {
      return node;
    }
    const found = findNodeInTree(node.children, themeId);
    if (found) {
      return found;
    }
  }
  return null;
}
