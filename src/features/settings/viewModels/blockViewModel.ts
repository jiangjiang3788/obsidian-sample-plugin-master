// src/features/settings/viewModels/blockViewModel.ts
/**
 * BlockView model builder (Phase2: shared/ui 纯化试点)
 *
 * 目标：把分组计算（业务规则）从 shared/ui/views/BlockView.tsx 挪到 feature 层。
 *
 * - shared/ui 只负责渲染（renderModel / DTO 驱动）
 * - feature 负责把 items + 配置（groupField/groupFields）转成可渲染结构
 *
 * 这是一个纯函数（无副作用），便于单测与复用。
 */

import type { Item, GroupNode } from '@core/public';
import { groupItemsByFields } from '@core/public';

export interface BlockViewModel {
  /** 生效的分组字段（按层级顺序） */
  effectiveGroupFields: string[];
  /** 已构建好的分组树；当不分组时为 null */
  groupTree: GroupNode[] | null;
}

/**
 * 把单字段/多字段配置归一化。
 * - 优先 groupFields（多级）
 * - 其次兼容 groupField（单级）
 */
export function resolveGroupFields(groupField?: string, groupFields?: string[]): string[] {
  if (groupFields && groupFields.length > 0) return groupFields;
  if (groupField) return [groupField];
  return [];
}

/**
 * 构建 BlockView 的渲染模型。
 */
export function buildBlockViewModel(params: {
  items: Item[];
  groupField?: string;
  groupFields?: string[];
}): BlockViewModel {
  const effectiveGroupFields = resolveGroupFields(params.groupField, params.groupFields);
  if (!effectiveGroupFields.length) {
    return { effectiveGroupFields, groupTree: null };
  }

  return {
    effectiveGroupFields,
    groupTree: groupItemsByFields(params.items, effectiveGroupFields),
  };
}
