/**
 * 自由布局领域 facade。
 *
 * V12 将配置归一化、placement 几何和 zIndex 事务拆入同目录 helper；
 * 这里保留旧公共路径，避免上层 import 变动。
 */
export {
    DEFAULT_FREEFORM_LAYOUT_CONFIG,
    FREEFORM_COLLAPSED_HEIGHT,
    getDefaultFreeformItemSize,
    normalizeFreeformLayoutConfig,
    snapFreeformValue,
} from './freeformLayoutConfig';
export type { FreeformItemSize } from './freeformLayoutConfig';
export {
    calculateFreeformCanvasHeight,
    createDefaultViewPlacement,
    createDefaultViewPlacements,
    filterViewPlacementsForLayout,
    getFreeformVisualHeight,
    moveViewPlacement,
    normalizeViewPlacement,
    removeViewPlacement,
    resizeViewPlacement,
    resolveViewPlacements,
} from './freeformLayoutPlacement';
export {
    bringViewPlacementToFront,
    bringViewPlacementsToFront,
    normalizeViewPlacementZIndices,
} from './freeformLayoutZIndex';
