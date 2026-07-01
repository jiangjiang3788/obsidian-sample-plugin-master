import type { FreeformLayoutConfig, ViewPlacement } from '../types/schema';
import {
    DEFAULT_CANVAS_WIDTH,
    FREEFORM_COLLAPSED_HEIGHT,
    ITEM_GAP,
    finiteOr,
    normalizeFreeformLayoutConfig,
    snapFreeformValue,
    type FreeformItemSize,
} from './freeformLayoutConfig';

export function normalizeViewPlacement(
    placement: Partial<ViewPlacement> | undefined,
    fallback: ViewPlacement,
    canvasWidth: number,
    config?: FreeformLayoutConfig
): ViewPlacement {
    const normalizedConfig = normalizeFreeformLayoutConfig(config);
    const safeCanvasWidth = Math.max(normalizedConfig.minItemWidth, finiteOr(canvasWidth, DEFAULT_CANVAS_WIDTH));
    const width = Math.min(safeCanvasWidth, Math.max(normalizedConfig.minItemWidth, Math.round(finiteOr(placement?.width, fallback.width))));
    const height = Math.max(normalizedConfig.minItemHeight, Math.round(finiteOr(placement?.height, fallback.height)));
    const maxX = Math.max(0, safeCanvasWidth - width);
    const rawX = Math.min(maxX, Math.max(0, finiteOr(placement?.x, fallback.x)));
    const rawY = Math.max(0, finiteOr(placement?.y, fallback.y));
    const x = normalizedConfig.snapToGrid ? Math.min(maxX, snapFreeformValue(rawX, normalizedConfig.gridSize)) : Math.round(rawX);
    const y = normalizedConfig.snapToGrid ? snapFreeformValue(rawY, normalizedConfig.gridSize) : Math.round(rawY);

    return {
        x,
        y,
        width,
        height,
        zIndex: placement?.zIndex ?? fallback.zIndex,
        locked: placement?.locked ?? fallback.locked,
        collapsed: placement?.collapsed ?? fallback.collapsed,
    };
}

export function createDefaultViewPlacement(
    index: number,
    canvasWidth: number,
    config?: FreeformLayoutConfig,
    preferredSize?: Partial<FreeformItemSize>
): ViewPlacement {
    const normalizedConfig = normalizeFreeformLayoutConfig(config);
    const safeCanvasWidth = Math.max(normalizedConfig.minItemWidth, finiteOr(canvasWidth, DEFAULT_CANVAS_WIDTH));
    const width = Math.min(Math.max(normalizedConfig.minItemWidth, preferredSize?.width ?? normalizedConfig.defaultItemWidth), safeCanvasWidth);
    const height = Math.max(normalizedConfig.minItemHeight, preferredSize?.height ?? normalizedConfig.defaultItemHeight);
    const columnWidth = width + ITEM_GAP;
    const columns = Math.max(1, Math.floor((safeCanvasWidth + ITEM_GAP) / columnWidth));
    const column = index % columns;
    const row = Math.floor(index / columns);

    return normalizeViewPlacement(
        { x: column * columnWidth, y: row * (height + ITEM_GAP), width, height, zIndex: index + 1 },
        { x: 0, y: 0, width, height, zIndex: index + 1 },
        safeCanvasWidth,
        normalizedConfig
    );
}

/** 按行打包不同默认尺寸的视图，避免异构卡片重叠。 */
export function createDefaultViewPlacements(
    viewInstanceIds: string[],
    canvasWidth: number,
    config?: FreeformLayoutConfig,
    preferredSizes?: Record<string, Partial<FreeformItemSize> | undefined>
): Record<string, ViewPlacement> {
    const normalizedConfig = normalizeFreeformLayoutConfig(config);
    const safeCanvasWidth = Math.max(normalizedConfig.minItemWidth, finiteOr(canvasWidth, DEFAULT_CANVAS_WIDTH));
    const result: Record<string, ViewPlacement> = {};
    let cursorX = 0;
    let cursorY = 0;
    let rowHeight = 0;
    let startIndex = 0;

    if (normalizedConfig.defaultTemplate === 'focus' && viewInstanceIds.length > 0) {
        const firstViewId = viewInstanceIds[0];
        const preferred = preferredSizes?.[firstViewId];
        const firstHeight = Math.max(normalizedConfig.minItemHeight, preferred?.height ?? normalizedConfig.defaultItemHeight);
        const fallback: ViewPlacement = { x: 0, y: 0, width: safeCanvasWidth, height: firstHeight, zIndex: 1 };
        result[firstViewId] = normalizeViewPlacement(fallback, fallback, safeCanvasWidth, normalizedConfig);
        cursorY = result[firstViewId].height + ITEM_GAP;
        startIndex = 1;
    }

    for (let index = startIndex; index < viewInstanceIds.length; index += 1) {
        const viewId = viewInstanceIds[index];
        const preferred = preferredSizes?.[viewId];
        const width = Math.min(safeCanvasWidth, Math.max(normalizedConfig.minItemWidth, preferred?.width ?? normalizedConfig.defaultItemWidth));
        const height = Math.max(normalizedConfig.minItemHeight, preferred?.height ?? normalizedConfig.defaultItemHeight);

        if (cursorX > 0 && cursorX + width > safeCanvasWidth) {
            cursorX = 0;
            cursorY += rowHeight + ITEM_GAP;
            rowHeight = 0;
        }

        const fallback: ViewPlacement = { x: cursorX, y: cursorY, width, height, zIndex: index + 1 };
        const placement = normalizeViewPlacement(fallback, fallback, safeCanvasWidth, normalizedConfig);
        result[viewId] = placement;
        cursorX = placement.x + placement.width + ITEM_GAP;
        rowHeight = Math.max(rowHeight, placement.height);
    }

    return result;
}

/** 合并已持久化 placement 与旧布局的运行时默认 placement。 */
export function resolveViewPlacements(
    viewInstanceIds: string[],
    persistedPlacements: Record<string, ViewPlacement> | undefined,
    canvasWidth: number,
    config?: FreeformLayoutConfig,
    preferredSizes?: Record<string, Partial<FreeformItemSize> | undefined>
): Record<string, ViewPlacement> {
    const defaults = createDefaultViewPlacements(viewInstanceIds, canvasWidth, config, preferredSizes);
    const persistedIds = viewInstanceIds.filter((viewId) => !!persistedPlacements?.[viewId]);
    if (persistedIds.length === 0) return defaults;

    const normalizedConfig = normalizeFreeformLayoutConfig(config);
    const safeCanvasWidth = Math.max(normalizedConfig.minItemWidth, finiteOr(canvasWidth, DEFAULT_CANVAS_WIDTH));
    const result: Record<string, ViewPlacement> = {};

    for (const viewId of persistedIds) {
        result[viewId] = normalizeViewPlacement(persistedPlacements?.[viewId], defaults[viewId], safeCanvasWidth, normalizedConfig);
    }

    let cursorX = 0;
    let cursorY = Object.values(result).reduce((maxBottom, placement) => Math.max(maxBottom, placement.y + getFreeformVisualHeight(placement)), 0) + ITEM_GAP;
    let rowHeight = 0;
    let nextZIndex = Object.values(result).reduce((maxValue, placement) => Math.max(maxValue, placement.zIndex ?? 0), 0) + 1;

    for (const viewId of viewInstanceIds) {
        if (result[viewId]) continue;
        const preferred = preferredSizes?.[viewId];
        const width = Math.min(safeCanvasWidth, Math.max(normalizedConfig.minItemWidth, preferred?.width ?? normalizedConfig.defaultItemWidth));
        const height = Math.max(normalizedConfig.minItemHeight, preferred?.height ?? normalizedConfig.defaultItemHeight);

        if (cursorX > 0 && cursorX + width > safeCanvasWidth) {
            cursorX = 0;
            cursorY += rowHeight + ITEM_GAP;
            rowHeight = 0;
        }

        const fallback: ViewPlacement = { x: cursorX, y: cursorY, width, height, zIndex: nextZIndex };
        const placement = normalizeViewPlacement(fallback, fallback, safeCanvasWidth, normalizedConfig);
        result[viewId] = placement;
        cursorX = placement.x + placement.width + ITEM_GAP;
        rowHeight = Math.max(rowHeight, placement.height);
        nextZIndex += 1;
    }

    return viewInstanceIds.reduce<Record<string, ViewPlacement>>((ordered, viewId) => {
        ordered[viewId] = result[viewId];
        return ordered;
    }, {});
}

export function moveViewPlacement(placement: ViewPlacement, delta: { x: number; y: number }, canvasWidth: number, config?: FreeformLayoutConfig): ViewPlacement {
    return normalizeViewPlacement({ ...placement, x: placement.x + delta.x, y: placement.y + delta.y }, placement, canvasWidth, config);
}

/** 从右下角缩放，限制最小尺寸与画布右边界，并按配置吸附尺寸。 */
export function resizeViewPlacement(placement: ViewPlacement, delta: { x: number; y: number }, canvasWidth: number, config?: FreeformLayoutConfig): ViewPlacement {
    const normalizedConfig = normalizeFreeformLayoutConfig(config);
    const safeCanvasWidth = Math.max(normalizedConfig.minItemWidth, finiteOr(canvasWidth, DEFAULT_CANVAS_WIDTH));
    const maxWidth = Math.max(normalizedConfig.minItemWidth, safeCanvasWidth - placement.x);
    const rawWidth = placement.width + delta.x;
    const rawHeight = placement.height + delta.y;
    let width = Math.min(maxWidth, Math.max(normalizedConfig.minItemWidth, rawWidth));
    let height = Math.max(normalizedConfig.minItemHeight, rawHeight);

    if (normalizedConfig.snapToGrid) {
        width = rawWidth <= normalizedConfig.minItemWidth ? normalizedConfig.minItemWidth : snapFreeformValue(width, normalizedConfig.gridSize);
        height = rawHeight <= normalizedConfig.minItemHeight ? normalizedConfig.minItemHeight : snapFreeformValue(height, normalizedConfig.gridSize);
    }

    width = Math.min(maxWidth, Math.max(normalizedConfig.minItemWidth, Math.round(width)));
    height = Math.max(normalizedConfig.minItemHeight, Math.round(height));
    return { ...placement, width, height };
}

export function getFreeformVisualHeight(placement: ViewPlacement): number {
    return placement.collapsed ? FREEFORM_COLLAPSED_HEIGHT : placement.height;
}

export function calculateFreeformCanvasHeight(placements: Record<string, ViewPlacement>, config?: FreeformLayoutConfig): number {
    const normalizedConfig = normalizeFreeformLayoutConfig(config);
    const contentBottom = Object.values(placements).reduce((maxBottom, placement) => Math.max(maxBottom, placement.y + getFreeformVisualHeight(placement)), 0);
    return Math.max(normalizedConfig.minCanvasHeight, contentBottom + ITEM_GAP);
}

/** 过滤掉不属于当前 Layout 的 placement，并复制数据以隔离持久化 draft。 */
export function filterViewPlacementsForLayout(viewInstanceIds: string[], placements: Record<string, ViewPlacement>): Record<string, ViewPlacement> {
    const validIds = new Set(viewInstanceIds);
    const next: Record<string, ViewPlacement> = {};
    for (const [viewInstanceId, placement] of Object.entries(placements)) {
        if (!validIds.has(viewInstanceId)) continue;
        next[viewInstanceId] = { ...placement };
    }
    return next;
}

export function removeViewPlacement(placements: Record<string, ViewPlacement> | undefined, viewInstanceId: string): Record<string, ViewPlacement> | undefined {
    if (!placements || !(viewInstanceId in placements)) return placements;
    const next = { ...placements };
    delete next[viewInstanceId];
    return next;
}
