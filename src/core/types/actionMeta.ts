// src/core/types/actionMeta.ts
/**
 * ActionMeta - 动作元数据类型定义
 * ---------------------------------------------------------------
 * 说明：
 * - 原先位于 shared/types/ActionMeta.ts，导致 core/services 反向依赖 shared。
 * - 该类型是“写操作可观测性”的基础合同，应归属于 core（SSOT）。
 */

/**
 * 写操作来源
 */
export type ActionSource = 'ui' | 'command' | 'service' | 'init' | 'unknown';

/**
 * 动作元数据
 */
export interface ActionMeta {
    /** 动作名称，例如 'useCases.layout.reorderLayouts' */
    action: string;
    /** 来源类型 */
    source: ActionSource;
    /** 是否输出调用栈（可选，默认 false） */
    debugStack?: boolean;
}

/**
 * 默认元数据
 */
export const DEFAULT_ACTION_META: ActionMeta = {
    action: 'unknown',
    source: 'unknown',
};

/**
 * 创建 useCase 级别的 meta
 * @param useCaseName 用例名称，例如 'layout.reorderLayouts'
 * @param source 来源
 */
export function createUseCaseMeta(
    useCaseName: string,
    source: ActionSource = 'ui'
): ActionMeta {
    return {
        action: `useCases.${useCaseName}`,
        source,
    };
}

/**
 * 创建 slice 级别的 meta
 * @param sliceName slice 名称，例如 'theme.addTheme'
 * @param source 来源
 */
export function createSliceMeta(
    sliceName: string,
    source: ActionSource = 'service'
): ActionMeta {
    return {
        action: `slice.${sliceName}`,
        source,
    };
}
