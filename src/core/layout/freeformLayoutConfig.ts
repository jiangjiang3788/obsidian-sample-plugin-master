import type { FreeformLayoutConfig, ViewName } from '@/core/view/ViewConfig';
import { getViewDefinition } from '@/core/config/views/registry';

export const DEFAULT_FREEFORM_LAYOUT_CONFIG: Required<FreeformLayoutConfig> = {
    defaultTemplate: 'balanced',
    snapToGrid: true,
    gridSize: 16,
    defaultItemWidth: 420,
    defaultItemHeight: 320,
    minItemWidth: 280,
    minItemHeight: 180,
    minCanvasWidth: 720,
    minCanvasHeight: 480,
};

export const DEFAULT_CANVAS_WIDTH = 960;
export const ITEM_GAP = 16;
export const FREEFORM_COLLAPSED_HEIGHT = 40;

export interface FreeformItemSize {
    width: number;
    height: number;
}

function normalizeTemplate(value: FreeformLayoutConfig['defaultTemplate']): 'balanced' | 'focus' {
    return value === 'focus' ? 'focus' : 'balanced';
}

export function finiteOr(value: number | undefined, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function normalizeFreeformLayoutConfig(config?: FreeformLayoutConfig): Required<FreeformLayoutConfig> {
    const gridSize = Math.max(4, Math.round(finiteOr(config?.gridSize, DEFAULT_FREEFORM_LAYOUT_CONFIG.gridSize)));
    const minItemWidth = Math.max(160, Math.round(finiteOr(config?.minItemWidth, DEFAULT_FREEFORM_LAYOUT_CONFIG.minItemWidth)));
    const minItemHeight = Math.max(120, Math.round(finiteOr(config?.minItemHeight, DEFAULT_FREEFORM_LAYOUT_CONFIG.minItemHeight)));

    return {
        defaultTemplate: normalizeTemplate(config?.defaultTemplate),
        snapToGrid: config?.snapToGrid ?? DEFAULT_FREEFORM_LAYOUT_CONFIG.snapToGrid,
        gridSize,
        minItemWidth,
        minItemHeight,
        defaultItemWidth: Math.max(minItemWidth, Math.round(finiteOr(config?.defaultItemWidth, DEFAULT_FREEFORM_LAYOUT_CONFIG.defaultItemWidth))),
        defaultItemHeight: Math.max(minItemHeight, Math.round(finiteOr(config?.defaultItemHeight, DEFAULT_FREEFORM_LAYOUT_CONFIG.defaultItemHeight))),
        minCanvasWidth: Math.max(minItemWidth, Math.round(finiteOr(config?.minCanvasWidth, DEFAULT_FREEFORM_LAYOUT_CONFIG.minCanvasWidth))),
        minCanvasHeight: Math.max(minItemHeight, Math.round(finiteOr(config?.minCanvasHeight, DEFAULT_FREEFORM_LAYOUT_CONFIG.minCanvasHeight))),
    };
}

export function snapFreeformValue(value: number, gridSize: number): number {
    return Math.round(value / gridSize) * gridSize;
}

/**
 * 不同视图的首屏信息密度不同。该函数只影响“尚未保存 placement”的默认尺寸，
 * 用户一旦拖动或缩放，持久化尺寸始终优先。
 */
export function getDefaultFreeformItemSize(viewType: ViewName | undefined, config?: FreeformLayoutConfig): FreeformItemSize {
    const normalizedConfig = normalizeFreeformLayoutConfig(config);
    const definition = viewType ? getViewDefinition(viewType) : undefined;
    const recommended = definition
        ? { width: definition.layout.freeformWidth, height: definition.layout.freeformHeight }
        : undefined;

    return {
        width: Math.max(normalizedConfig.minItemWidth, recommended?.width ?? normalizedConfig.defaultItemWidth),
        height: Math.max(normalizedConfig.minItemHeight, recommended?.height ?? normalizedConfig.defaultItemHeight),
    };
}
