/**
 * @covers F098/unit
 * @covers F098/regression
 */
import { getWhiteboardGridMetrics, getWhiteboardGridStyle } from '@/features/whiteboard/WhiteboardGridModel';

describe('白板世界网格 1.1.5', () => {
  test('网格跟随 camera 移动，并保持 world 原点/倍数位置一致', () => {
    expect(getWhiteboardGridMetrics({ x: -125, y: 75 }, 1)).toEqual({
      minorSizePx: 50,
      majorSizePx: 250,
      minorOffsetX: 25,
      minorOffsetY: 25,
      majorOffsetX: 125,
      majorOffsetY: 175,
    });
  });

  test('从极小到极大 zoom 都自适应 world 步长，避免屏幕网格密到糊成一片或稀到看不见', () => {
    for (const zoom of [0.005, 0.01, 0.1, 1, 10, 128]) {
      const grid = getWhiteboardGridMetrics({ x: -1234.5, y: 987.25 }, zoom);
      expect(grid.minorSizePx).toBeGreaterThanOrEqual(32);
      expect(grid.minorSizePx).toBeLessThanOrEqual(80);
      expect(grid.majorSizePx).toBe(grid.minorSizePx * 5);
      expect(grid.minorOffsetX).toBeGreaterThanOrEqual(0);
      expect(grid.minorOffsetX).toBeLessThan(grid.minorSizePx);
    }
  });

  test('viewport style 暴露 camera-aware CSS 网格变量，不依赖巨大 canvas', () => {
    const style = getWhiteboardGridStyle({ x: -125, y: 75 }, 1);
    expect(style).toContain('--think-whiteboard-grid-minor:50px');
    expect(style).toContain('--think-whiteboard-grid-major:250px');
    expect(style).toContain('--think-whiteboard-grid-major-x:125px');
  });
});
