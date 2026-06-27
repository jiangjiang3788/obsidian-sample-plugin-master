import {
    bringViewPlacementToFront,
    bringViewPlacementsToFront,
    calculateFreeformCanvasHeight,
    createDefaultViewPlacement,
    createDefaultViewPlacements,
    getDefaultFreeformItemSize,
    getFreeformVisualHeight,
    moveViewPlacement,
    normalizeFreeformLayoutConfig,
    normalizeViewPlacementZIndices,
    removeViewPlacement,
    resizeViewPlacement,
    resolveViewPlacements,
    snapFreeformValue,
} from '@core/layout/freeformLayout';

describe('freeformLayout model', () => {
    it('为旧布局按视图顺序生成稳定的默认位置，但不修改输入对象', () => {
        const persisted = {
            a: { x: 31, y: 17, width: 400, height: 260 },
        };
        const snapshot = JSON.stringify(persisted);

        const placements = resolveViewPlacements(['a', 'b', 'c'], persisted, 900, {
            gridSize: 16,
            snapToGrid: true,
            defaultItemWidth: 400,
            defaultItemHeight: 260,
        });

        expect(placements.a).toMatchObject({ x: 32, y: 16, width: 400, height: 260 });
        expect(placements.b.y).toBeGreaterThan(placements.a.y + placements.a.height);
        expect(placements.c.y).toBeGreaterThanOrEqual(placements.b.y);
        expect(JSON.stringify(persisted)).toBe(snapshot);
    });

    it('拖动时吸附网格并限制左上和右侧边界', () => {
        const placement = { x: 32, y: 32, width: 300, height: 220 };

        expect(moveViewPlacement(placement, { x: -100, y: -80 }, 640, { gridSize: 16 }))
            .toMatchObject({ x: 0, y: 0 });

        expect(moveViewPlacement(placement, { x: 1000, y: 19 }, 640, { gridSize: 16 }))
            .toMatchObject({ x: 336, y: 48 });
    });

    it('从右下角缩放时吸附尺寸、限制最小值并且不越过画布右边界', () => {
        const placement = { x: 320, y: 32, width: 300, height: 220 };

        expect(resizeViewPlacement(placement, { x: 45, y: 29 }, 800, {
            gridSize: 16,
            minItemWidth: 280,
            minItemHeight: 180,
        })).toMatchObject({ width: 352, height: 256 });

        expect(resizeViewPlacement(placement, { x: -1000, y: -1000 }, 800, {
            gridSize: 16,
            minItemWidth: 280,
            minItemHeight: 180,
        })).toMatchObject({ width: 280, height: 180 });

        expect(resizeViewPlacement(placement, { x: 1000, y: 0 }, 800, {
            gridSize: 16,
        }).width).toBe(480);
    });

    it('异构默认尺寸按行打包，不会让后一张卡片覆盖前一张', () => {
        const placements = createDefaultViewPlacements(
            ['table', 'stats', 'timeline'],
            960,
            { snapToGrid: false },
            {
                table: { width: 680, height: 420 },
                stats: { width: 440, height: 340 },
                timeline: { width: 680, height: 420 },
            }
        );

        expect(placements.table).toMatchObject({ x: 0, y: 0, width: 680, height: 420 });
        expect(placements.stats.y).toBeGreaterThanOrEqual(436);
        expect(placements.timeline.y).toBeGreaterThan(placements.stats.y);
    });

    it('按视图类型提供仅用于首次排布的推荐尺寸', () => {
        expect(getDefaultFreeformItemSize('ExcelView')).toEqual({ width: 760, height: 460 });
        expect(getDefaultFreeformItemSize('StatisticsView')).toEqual({ width: 440, height: 340 });
        expect(getDefaultFreeformItemSize(undefined, {
            defaultItemWidth: 500,
            defaultItemHeight: 300,
        })).toEqual({ width: 500, height: 300 });
    });

    it('配置中的最小尺寸会约束默认尺寸和画布尺寸', () => {
        expect(normalizeFreeformLayoutConfig({
            defaultItemWidth: 200,
            defaultItemHeight: 100,
            minItemWidth: 360,
            minItemHeight: 240,
            minCanvasWidth: 200,
        })).toMatchObject({
            defaultItemWidth: 360,
            defaultItemHeight: 240,
            minItemWidth: 360,
            minItemHeight: 240,
            minCanvasWidth: 360,
        });
    });

    it('根据最底部视图自动扩展画布高度', () => {
        expect(calculateFreeformCanvasHeight({
            a: { x: 0, y: 0, width: 300, height: 200 },
            b: { x: 0, y: 500, width: 300, height: 300 },
        }, { minCanvasHeight: 480 })).toBe(816);
    });

    it('删除 placement 时不修改原对象', () => {
        const placements = {
            a: createDefaultViewPlacement(0, 900),
            b: createDefaultViewPlacement(1, 900),
        };
        const next = removeViewPlacement(placements, 'a');

        expect(next).not.toBe(placements);
        expect(next?.a).toBeUndefined();
        expect(placements.a).toBeDefined();
    });

    it('网格吸附使用最近网格点', () => {
        expect(snapFreeformValue(23, 16)).toBe(16);
        expect(snapFreeformValue(25, 16)).toBe(32);
    });
    it('焦点模板让第一个视图横跨首行，其余视图从下一行开始', () => {
        const placements = createDefaultViewPlacements(
            ['primary', 'secondary', 'third'],
            960,
            { defaultTemplate: 'focus', snapToGrid: false },
            {
                primary: { width: 480, height: 360 },
                secondary: { width: 440, height: 300 },
                third: { width: 440, height: 300 },
            }
        );

        expect(placements.primary).toMatchObject({ x: 0, y: 0, width: 960, height: 360 });
        expect(placements.secondary.y).toBe(376);
        expect(placements.third.y).toBe(376);
        expect(placements.third.x).toBeGreaterThan(placements.secondary.x);
    });

    it('折叠只改变视觉高度，不覆盖用户保存的展开高度', () => {
        const placement = { x: 0, y: 500, width: 400, height: 320, collapsed: true };
        expect(getFreeformVisualHeight(placement)).toBe(40);
        expect(placement.height).toBe(320);
        expect(calculateFreeformCanvasHeight({ a: placement }, { minCanvasHeight: 100 })).toBe(556);
    });

    it('置顶只返回目标卡片的新层级，不修改输入对象', () => {
        const placements = {
            a: { x: 0, y: 0, width: 300, height: 200, zIndex: 1 },
            b: { x: 10, y: 10, width: 300, height: 200, zIndex: 5 },
        };
        const next = bringViewPlacementToFront(placements, 'a');

        expect(next?.zIndex).toBe(6);
        expect(placements.a.zIndex).toBe(1);
        expect(bringViewPlacementToFront(placements, 'b')).toBe(placements.b);
        expect(bringViewPlacementToFront({ ...placements, c: { ...placements.b } }, 'b')?.zIndex).toBe(6);
    });

    it('未知模板值回退为均衡排布', () => {
        expect(normalizeFreeformLayoutConfig({ defaultTemplate: 'unknown' as any }).defaultTemplate)
            .toBe('balanced');
    });

    it('层级归一化按现有层级和布局顺序压缩为连续值', () => {
        const placements = {
            a: { x: 0, y: 0, width: 300, height: 200, zIndex: 100 },
            b: { x: 0, y: 0, width: 300, height: 200, zIndex: 5 },
            c: { x: 0, y: 0, width: 300, height: 200, zIndex: 5 },
        };

        const normalized = normalizeViewPlacementZIndices(placements, ['c', 'b', 'a']);
        expect(normalized.c.zIndex).toBe(1);
        expect(normalized.b.zIndex).toBe(2);
        expect(normalized.a.zIndex).toBe(3);
        expect(placements.a.zIndex).toBe(100);
        expect(normalizeViewPlacementZIndices(normalized, ['c', 'b', 'a'])).toBe(normalized);
    });

    it('置顶同时归一化全部层级，避免 zIndex 无限增长', () => {
        const placements = {
            a: { x: 0, y: 0, width: 300, height: 200, zIndex: 9000 },
            b: { x: 10, y: 10, width: 300, height: 200, zIndex: 12000 },
            c: { x: 20, y: 20, width: 300, height: 200, zIndex: 15000 },
        };

        const next = bringViewPlacementsToFront(placements, 'a', ['a', 'b', 'c']);
        expect(next.a.zIndex).toBe(3);
        expect(next.b.zIndex).toBe(1);
        expect(next.c.zIndex).toBe(2);
        expect(Math.max(...Object.values(next).map((placement) => placement.zIndex ?? 0))).toBe(3);
        expect(bringViewPlacementsToFront(next, 'a', ['a', 'b', 'c'])).toBe(next);
    });

});
