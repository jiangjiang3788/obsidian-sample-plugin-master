import type {
    FreeformLayoutConfig,
    ViewName,
    ViewPlacement,
} from '../types/schema';

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

const DEFAULT_CANVAS_WIDTH = 960;
const ITEM_GAP = 16;
export const FREEFORM_COLLAPSED_HEIGHT = 40;

export interface FreeformItemSize {
    width: number;
    height: number;
}

function normalizeTemplate(value: FreeformLayoutConfig['defaultTemplate']): 'balanced' | 'focus' {
    return value === 'focus' ? 'focus' : 'balanced';
}

function finiteOr(value: number | undefined, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function normalizeFreeformLayoutConfig(
    config?: FreeformLayoutConfig
): Required<FreeformLayoutConfig> {
    const gridSize = Math.max(4, Math.round(finiteOr(config?.gridSize, DEFAULT_FREEFORM_LAYOUT_CONFIG.gridSize)));
    const minItemWidth = Math.max(
        160,
        Math.round(finiteOr(config?.minItemWidth, DEFAULT_FREEFORM_LAYOUT_CONFIG.minItemWidth))
    );
    const minItemHeight = Math.max(
        120,
        Math.round(finiteOr(config?.minItemHeight, DEFAULT_FREEFORM_LAYOUT_CONFIG.minItemHeight))
    );

    return {
        defaultTemplate: normalizeTemplate(config?.defaultTemplate),
        snapToGrid: config?.snapToGrid ?? DEFAULT_FREEFORM_LAYOUT_CONFIG.snapToGrid,
        gridSize,
        minItemWidth,
        minItemHeight,
        defaultItemWidth: Math.max(
            minItemWidth,
            Math.round(finiteOr(config?.defaultItemWidth, DEFAULT_FREEFORM_LAYOUT_CONFIG.defaultItemWidth))
        ),
        defaultItemHeight: Math.max(
            minItemHeight,
            Math.round(finiteOr(config?.defaultItemHeight, DEFAULT_FREEFORM_LAYOUT_CONFIG.defaultItemHeight))
        ),
        minCanvasWidth: Math.max(
            minItemWidth,
            Math.round(finiteOr(config?.minCanvasWidth, DEFAULT_FREEFORM_LAYOUT_CONFIG.minCanvasWidth))
        ),
        minCanvasHeight: Math.max(
            minItemHeight,
            Math.round(finiteOr(config?.minCanvasHeight, DEFAULT_FREEFORM_LAYOUT_CONFIG.minCanvasHeight))
        ),
    };
}

export function snapFreeformValue(value: number, gridSize: number): number {
    return Math.round(value / gridSize) * gridSize;
}

/**
 * 不同视图的首屏信息密度不同。该函数只影响“尚未保存 placement”的默认尺寸，
 * 用户一旦拖动或缩放，持久化尺寸始终优先。
 */
export function getDefaultFreeformItemSize(
    viewType: ViewName | undefined,
    config?: FreeformLayoutConfig
): FreeformItemSize {
    const normalizedConfig = normalizeFreeformLayoutConfig(config);
    const recommendations: Partial<Record<ViewName, FreeformItemSize>> = {
        BlockView: { width: 480, height: 340 },
        TableView: { width: 680, height: 420 },
        ExcelView: { width: 760, height: 460 },
        TimelineView: { width: 680, height: 420 },
        StatisticsView: { width: 440, height: 340 },
        HeatmapView: { width: 520, height: 360 },
        EventTimelineView: { width: 680, height: 420 },
        ProgressView: { width: 480, height: 360 },
        TaskExecutionView: { width: 560, height: 380 },
    };
    const recommended = viewType ? recommendations[viewType] : undefined;

    return {
        width: Math.max(normalizedConfig.minItemWidth, recommended?.width ?? normalizedConfig.defaultItemWidth),
        height: Math.max(normalizedConfig.minItemHeight, recommended?.height ?? normalizedConfig.defaultItemHeight),
    };
}

export function normalizeViewPlacement(
    placement: Partial<ViewPlacement> | undefined,
    fallback: ViewPlacement,
    canvasWidth: number,
    config?: FreeformLayoutConfig
): ViewPlacement {
    const normalizedConfig = normalizeFreeformLayoutConfig(config);
    const safeCanvasWidth = Math.max(
        normalizedConfig.minItemWidth,
        finiteOr(canvasWidth, DEFAULT_CANVAS_WIDTH)
    );
    const width = Math.min(
        safeCanvasWidth,
        Math.max(
            normalizedConfig.minItemWidth,
            Math.round(finiteOr(placement?.width, fallback.width))
        )
    );
    const height = Math.max(
        normalizedConfig.minItemHeight,
        Math.round(finiteOr(placement?.height, fallback.height))
    );
    const maxX = Math.max(0, safeCanvasWidth - width);
    const rawX = Math.min(maxX, Math.max(0, finiteOr(placement?.x, fallback.x)));
    const rawY = Math.max(0, finiteOr(placement?.y, fallback.y));
    const x = normalizedConfig.snapToGrid
        ? Math.min(maxX, snapFreeformValue(rawX, normalizedConfig.gridSize))
        : Math.round(rawX);
    const y = normalizedConfig.snapToGrid
        ? snapFreeformValue(rawY, normalizedConfig.gridSize)
        : Math.round(rawY);

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
    const safeCanvasWidth = Math.max(
        normalizedConfig.minItemWidth,
        finiteOr(canvasWidth, DEFAULT_CANVAS_WIDTH)
    );
    const width = Math.min(
        Math.max(normalizedConfig.minItemWidth, preferredSize?.width ?? normalizedConfig.defaultItemWidth),
        safeCanvasWidth
    );
    const height = Math.max(
        normalizedConfig.minItemHeight,
        preferredSize?.height ?? normalizedConfig.defaultItemHeight
    );
    const columnWidth = width + ITEM_GAP;
    const columns = Math.max(1, Math.floor((safeCanvasWidth + ITEM_GAP) / columnWidth));
    const column = index % columns;
    const row = Math.floor(index / columns);

    return normalizeViewPlacement(
        {
            x: column * columnWidth,
            y: row * (height + ITEM_GAP),
            width,
            height,
            zIndex: index + 1,
        },
        {
            x: 0,
            y: 0,
            width,
            height,
            zIndex: index + 1,
        },
        safeCanvasWidth,
        normalizedConfig
    );
}

/**
 * 按行打包不同默认尺寸的视图，避免 V1 按 index 计算时出现异构卡片重叠。
 */
export function createDefaultViewPlacements(
    viewInstanceIds: string[],
    canvasWidth: number,
    config?: FreeformLayoutConfig,
    preferredSizes?: Record<string, Partial<FreeformItemSize> | undefined>
): Record<string, ViewPlacement> {
    const normalizedConfig = normalizeFreeformLayoutConfig(config);
    const safeCanvasWidth = Math.max(
        normalizedConfig.minItemWidth,
        finiteOr(canvasWidth, DEFAULT_CANVAS_WIDTH)
    );
    const result: Record<string, ViewPlacement> = {};
    let cursorX = 0;
    let cursorY = 0;
    let rowHeight = 0;
    let startIndex = 0;

    // “焦点 + 网格”：第一个视图横跨首行，其余视图从下一行继续按推荐尺寸排列。
    if (normalizedConfig.defaultTemplate === 'focus' && viewInstanceIds.length > 0) {
        const firstViewId = viewInstanceIds[0];
        const preferred = preferredSizes?.[firstViewId];
        const firstHeight = Math.max(
            normalizedConfig.minItemHeight,
            preferred?.height ?? normalizedConfig.defaultItemHeight
        );
        const fallback: ViewPlacement = {
            x: 0,
            y: 0,
            width: safeCanvasWidth,
            height: firstHeight,
            zIndex: 1,
        };
        result[firstViewId] = normalizeViewPlacement(
            fallback,
            fallback,
            safeCanvasWidth,
            normalizedConfig
        );
        cursorY = result[firstViewId].height + ITEM_GAP;
        startIndex = 1;
    }

    for (let index = startIndex; index < viewInstanceIds.length; index += 1) {
        const viewId = viewInstanceIds[index];
        const preferred = preferredSizes?.[viewId];
        const width = Math.min(
            safeCanvasWidth,
            Math.max(normalizedConfig.minItemWidth, preferred?.width ?? normalizedConfig.defaultItemWidth)
        );
        const height = Math.max(
            normalizedConfig.minItemHeight,
            preferred?.height ?? normalizedConfig.defaultItemHeight
        );

        if (cursorX > 0 && cursorX + width > safeCanvasWidth) {
            cursorX = 0;
            cursorY += rowHeight + ITEM_GAP;
            rowHeight = 0;
        }

        const fallback: ViewPlacement = {
            x: cursorX,
            y: cursorY,
            width,
            height,
            zIndex: index + 1,
        };
        const placement = normalizeViewPlacement(
            fallback,
            fallback,
            safeCanvasWidth,
            normalizedConfig
        );
        result[viewId] = placement;
        cursorX = placement.x + placement.width + ITEM_GAP;
        rowHeight = Math.max(rowHeight, placement.height);
    }

    return result;
}

/**
 * 合并已持久化 placement 与旧布局的运行时默认 placement。
 * 缺失 placement 只在内存中推导，不会自动写回 settings。
 */
export function resolveViewPlacements(
    viewInstanceIds: string[],
    persistedPlacements: Record<string, ViewPlacement> | undefined,
    canvasWidth: number,
    config?: FreeformLayoutConfig,
    preferredSizes?: Record<string, Partial<FreeformItemSize> | undefined>
): Record<string, ViewPlacement> {
    const defaults = createDefaultViewPlacements(
        viewInstanceIds,
        canvasWidth,
        config,
        preferredSizes
    );
    const persistedIds = viewInstanceIds.filter((viewId) => !!persistedPlacements?.[viewId]);

    // 完全没有保存数据时按所选模板推导，保持旧布局零迁移、零写回。
    if (persistedIds.length === 0) return defaults;

    const normalizedConfig = normalizeFreeformLayoutConfig(config);
    const safeCanvasWidth = Math.max(
        normalizedConfig.minItemWidth,
        finiteOr(canvasWidth, DEFAULT_CANVAS_WIDTH)
    );
    const result: Record<string, ViewPlacement> = {};

    for (const viewId of persistedIds) {
        result[viewId] = normalizeViewPlacement(
            persistedPlacements?.[viewId],
            defaults[viewId],
            safeCanvasWidth,
            normalizedConfig
        );
    }

    // 新加入的视图统一追加在现有自由布局下方，避免与用户手动摆放的卡片重叠。
    let cursorX = 0;
    let cursorY = Object.values(result).reduce(
        (maxBottom, placement) => Math.max(maxBottom, placement.y + getFreeformVisualHeight(placement)),
        0
    ) + ITEM_GAP;
    let rowHeight = 0;
    let nextZIndex = Object.values(result).reduce(
        (maxValue, placement) => Math.max(maxValue, placement.zIndex ?? 0),
        0
    ) + 1;

    for (const viewId of viewInstanceIds) {
        if (result[viewId]) continue;
        const preferred = preferredSizes?.[viewId];
        const width = Math.min(
            safeCanvasWidth,
            Math.max(normalizedConfig.minItemWidth, preferred?.width ?? normalizedConfig.defaultItemWidth)
        );
        const height = Math.max(
            normalizedConfig.minItemHeight,
            preferred?.height ?? normalizedConfig.defaultItemHeight
        );

        if (cursorX > 0 && cursorX + width > safeCanvasWidth) {
            cursorX = 0;
            cursorY += rowHeight + ITEM_GAP;
            rowHeight = 0;
        }

        const fallback: ViewPlacement = {
            x: cursorX,
            y: cursorY,
            width,
            height,
            zIndex: nextZIndex,
        };
        const placement = normalizeViewPlacement(
            fallback,
            fallback,
            safeCanvasWidth,
            normalizedConfig
        );
        result[viewId] = placement;
        cursorX = placement.x + placement.width + ITEM_GAP;
        rowHeight = Math.max(rowHeight, placement.height);
        nextZIndex += 1;
    }

    // 输出顺序与 Layout.viewInstanceIds 一致，便于调试和稳定快照。
    return viewInstanceIds.reduce<Record<string, ViewPlacement>>((ordered, viewId) => {
        ordered[viewId] = result[viewId];
        return ordered;
    }, {});
}

export function moveViewPlacement(
    placement: ViewPlacement,
    delta: { x: number; y: number },
    canvasWidth: number,
    config?: FreeformLayoutConfig
): ViewPlacement {
    return normalizeViewPlacement(
        {
            ...placement,
            x: placement.x + delta.x,
            y: placement.y + delta.y,
        },
        placement,
        canvasWidth,
        config
    );
}

/** 从右下角缩放，限制最小尺寸与画布右边界，并按配置吸附尺寸。 */
export function resizeViewPlacement(
    placement: ViewPlacement,
    delta: { x: number; y: number },
    canvasWidth: number,
    config?: FreeformLayoutConfig
): ViewPlacement {
    const normalizedConfig = normalizeFreeformLayoutConfig(config);
    const safeCanvasWidth = Math.max(
        normalizedConfig.minItemWidth,
        finiteOr(canvasWidth, DEFAULT_CANVAS_WIDTH)
    );
    const maxWidth = Math.max(normalizedConfig.minItemWidth, safeCanvasWidth - placement.x);
    const rawWidth = placement.width + delta.x;
    const rawHeight = placement.height + delta.y;
    let width = Math.min(
        maxWidth,
        Math.max(normalizedConfig.minItemWidth, rawWidth)
    );
    let height = Math.max(normalizedConfig.minItemHeight, rawHeight);

    if (normalizedConfig.snapToGrid) {
        width = rawWidth <= normalizedConfig.minItemWidth
            ? normalizedConfig.minItemWidth
            : snapFreeformValue(width, normalizedConfig.gridSize);
        height = rawHeight <= normalizedConfig.minItemHeight
            ? normalizedConfig.minItemHeight
            : snapFreeformValue(height, normalizedConfig.gridSize);
    }

    width = Math.min(maxWidth, Math.max(normalizedConfig.minItemWidth, Math.round(width)));
    height = Math.max(normalizedConfig.minItemHeight, Math.round(height));

    return {
        ...placement,
        width,
        height,
    };
}

export function getFreeformVisualHeight(placement: ViewPlacement): number {
    return placement.collapsed ? FREEFORM_COLLAPSED_HEIGHT : placement.height;
}

/** 返回目标卡片置顶后的 placement；未改变其它卡片的持久化数据。 */
export function bringViewPlacementToFront(
    placements: Record<string, ViewPlacement>,
    viewInstanceId: string
): ViewPlacement | undefined {
    const target = placements[viewInstanceId];
    if (!target) return undefined;
    const targetZIndex = target.zIndex ?? 0;
    const maxZIndex = Object.values(placements).reduce(
        (maxValue, placement) => Math.max(maxValue, placement.zIndex ?? 0),
        0
    );
    const hasPeerAtOrAbove = Object.entries(placements).some(
        ([id, placement]) => id !== viewInstanceId && (placement.zIndex ?? 0) >= targetZIndex
    );
    if (!hasPeerAtOrAbove) return target;
    return { ...target, zIndex: maxZIndex + 1 };
}


/**
 * 将自由布局层级压缩为 1..N。排序优先使用当前 zIndex，层级相同或缺失时
 * 使用 Layout.viewInstanceIds 的稳定顺序，避免长期置顶后 zIndex 无界增长。
 */
export function normalizeViewPlacementZIndices(
    placements: Record<string, ViewPlacement>,
    preferredOrder: string[] = Object.keys(placements)
): Record<string, ViewPlacement> {
    const order = new Map(preferredOrder.map((id, index) => [id, index]));
    const entries = Object.entries(placements).sort(([leftId, left], [rightId, right]) => {
        const zDiff = (left.zIndex ?? 0) - (right.zIndex ?? 0);
        if (zDiff !== 0) return zDiff;
        return (order.get(leftId) ?? Number.MAX_SAFE_INTEGER)
            - (order.get(rightId) ?? Number.MAX_SAFE_INTEGER);
    });

    let changed = false;
    const normalized: Record<string, ViewPlacement> = {};
    entries.forEach(([id, placement], index) => {
        const zIndex = index + 1;
        if (placement.zIndex !== zIndex) changed = true;
        normalized[id] = placement.zIndex === zIndex
            ? placement
            : { ...placement, zIndex };
    });

    return changed ? normalized : placements;
}

/**
 * 将目标卡片置于最上层，并在同一次操作中归一化所有卡片层级。
 * 返回完整 placement 集合，便于通过一次持久化写入保持层级一致。
 */
export function bringViewPlacementsToFront(
    placements: Record<string, ViewPlacement>,
    viewInstanceId: string,
    preferredOrder: string[] = Object.keys(placements)
): Record<string, ViewPlacement> {
    if (!placements[viewInstanceId]) return placements;

    const normalized = normalizeViewPlacementZIndices(placements, preferredOrder);
    const orderedIds = Object.entries(normalized)
        .sort(([, left], [, right]) => (left.zIndex ?? 0) - (right.zIndex ?? 0))
        .map(([id]) => id);
    const topId = orderedIds[orderedIds.length - 1];
    if (topId === viewInstanceId) return normalized;

    const withoutTarget = orderedIds.filter((id) => id !== viewInstanceId);
    const nextOrder = [...withoutTarget, viewInstanceId];
    let changed = normalized !== placements;
    const next: Record<string, ViewPlacement> = {};
    nextOrder.forEach((id, index) => {
        const placement = normalized[id];
        const zIndex = index + 1;
        if (placement.zIndex !== zIndex) changed = true;
        next[id] = placement.zIndex === zIndex
            ? placement
            : { ...placement, zIndex };
    });

    return changed ? next : placements;
}

export function calculateFreeformCanvasHeight(
    placements: Record<string, ViewPlacement>,
    config?: FreeformLayoutConfig
): number {
    const normalizedConfig = normalizeFreeformLayoutConfig(config);
    const contentBottom = Object.values(placements).reduce(
        (maxBottom, placement) => Math.max(maxBottom, placement.y + getFreeformVisualHeight(placement)),
        0
    );
    return Math.max(normalizedConfig.minCanvasHeight, contentBottom + ITEM_GAP);
}


/** 过滤掉不属于当前 Layout 的 placement，并复制数据以隔离持久化 draft。 */
export function filterViewPlacementsForLayout(
    viewInstanceIds: string[],
    placements: Record<string, ViewPlacement>
): Record<string, ViewPlacement> {
    const validIds = new Set(viewInstanceIds);
    const next: Record<string, ViewPlacement> = {};
    for (const [viewInstanceId, placement] of Object.entries(placements)) {
        if (!validIds.has(viewInstanceId)) continue;
        next[viewInstanceId] = { ...placement };
    }
    return next;
}

export function removeViewPlacement(
    placements: Record<string, ViewPlacement> | undefined,
    viewInstanceId: string
): Record<string, ViewPlacement> | undefined {
    if (!placements || !(viewInstanceId in placements)) return placements;
    const next = { ...placements };
    delete next[viewInstanceId];
    return next;
}
