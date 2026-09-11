/**
 * @covers F094/unit
 * @covers F094/regression
 * @covers F098/unit
 * @covers F098/regression
 */
import { getWhiteboardConnectionPreviewPath, getWhiteboardEdgeGeometry, resolveWhiteboardItemPosition } from '@/features/whiteboard/WhiteboardEdgeGeometry';

describe('白板 edge geometry', () => {
  it('A→B 从卡片边缘生成稳定有方向的贝塞尔路径', () => {
    const geometry = getWhiteboardEdgeGeometry({ x: 24, y: 40 }, { x: 400, y: 220 });
    expect(geometry.startX).toBe(272);
    expect(geometry.endX).toBe(400);
    expect(geometry.startY).toBe(88);
    expect(geometry.endY).toBe(268);
    expect(geometry.pathD).toContain('M 272 88 C');
  });

  it('目标在左侧时切换左右锚点，方向仍保持 from→to', () => {
    const geometry = getWhiteboardEdgeGeometry({ x: 500, y: 20 }, { x: 100, y: 80 });
    expect(geometry.startX).toBe(500);
    expect(geometry.endX).toBe(348);
    expect(geometry.control1X).toBeLessThan(geometry.startX);
    expect(geometry.control2X).toBeGreaterThan(geometry.endX);
  });

  it('负 world 坐标仍生成同一套 Edge 几何，camera transform 后会与卡片一起移动', () => {
    const geometry = getWhiteboardEdgeGeometry({ x: -300, y: -100 }, { x: 100, y: 50 });
    expect(geometry.startX).toBe(-52);
    expect(geometry.startY).toBe(-52);
    expect(geometry.endX).toBe(100);
    expect(geometry.endY).toBe(98);
  });

  it('drag preview 只替换临时坐标，不改变持久 item', () => {
    const item = { id: 'item-a', recordId: 'rec-a', x: 10, y: 20, zIndex: 1 };
    const resolved = resolveWhiteboardItemPosition(item, { itemId: 'item-a', position: { x: 110, y: 220, zIndex: 9 } });
    expect(resolved).toEqual({ ...item, x: 110, y: 220, zIndex: 9 });
    expect(item).toEqual({ id: 'item-a', recordId: 'rec-a', x: 10, y: 20, zIndex: 1 });
  });

  it('四边拖线时使用 pointer world 起点生成临时贝塞尔预览，不写 durable edge', () => {
    expect(getWhiteboardConnectionPreviewPath({ x: -20, y: 40 }, { x: 300, y: 180 })).toBe('M -20 40 C 140 40, 140 180, 300 180');
  });

});
