/**
 * @covers semantic presentation geometry
 * @covers compact locator collision regression
 * @covers semantic guide declutter regression
 */
import {
  buildWhiteboardSemanticPresentationModel,
  type WhiteboardSemanticPresentationPlacement,
} from '@/features/whiteboard/WhiteboardSemanticPresentationModel';
import type { WhiteboardSemanticLayoutGuide } from '@/features/whiteboard/WhiteboardSemanticLayoutModel';

function rectOf(placement: WhiteboardSemanticPresentationPlacement, zoom: number) {
  const cx = placement.worldPoint.x * zoom; const cy = placement.worldPoint.y * zoom;
  return {
    left: cx - placement.widthPx / 2,
    right: cx + placement.widthPx / 2,
    top: cy - placement.heightPx / 2,
    bottom: cy + placement.heightPx / 2,
  };
}
function overlaps(a: ReturnType<typeof rectOf>, b: ReturnType<typeof rectOf>) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

describe('Whiteboard Presentation Geometry', () => {
  test('低倍率密集网格只移动 presentation worldPoint，不改变 durable worldAnchor，并消除 Locator 覆盖', () => {
    const zoom = 0.2;
    const model = buildWhiteboardSemanticPresentationModel({
      level: 'compact', zoom,
      nodes: [
        { id: 'a', kind: 'item', worldAnchor: { x: 0, y: 0 }, label: '精力 80' },
        { id: 'b', kind: 'item', worldAnchor: { x: 320, y: 0 }, label: '东方国度' },
        { id: 'c', kind: 'item', worldAnchor: { x: 640, y: 0 }, label: '多发点' },
        { id: 'd', kind: 'item', worldAnchor: { x: 960, y: 0 }, label: '打卡·评分 2' },
      ],
    });
    const placements = [...model.items.values()];
    expect(placements.map((entry) => entry.worldAnchor)).toEqual([
      { x: 0, y: 0 }, { x: 320, y: 0 }, { x: 640, y: 0 }, { x: 960, y: 0 },
    ]);
    expect(placements.some((entry) => entry.screenOffsetY !== 0 || entry.screenOffsetX !== 0)).toBe(true);
    for (let i = 0; i < placements.length; i += 1) {
      for (let j = i + 1; j < placements.length; j += 1) {
        expect(overlaps(rectOf(placements[i], zoom), rectOf(placements[j], zoom))).toBe(false);
      }
    }
  });

  test('Goal / Record Type / Time 在屏幕空间冲突时降级为 dot，而不是继续让固定字号文字互盖', () => {
    const guides: WhiteboardSemanticLayoutGuide[] = [
      { id: 'goal', kind: 'goal', label: '照顾好自己/健康', x: 0, y: 0, width: 1200, height: 800, itemIds: ['a'] },
      { id: 'type', kind: 'recordType', label: '思考', x: 20, y: 20, width: 400, height: 38, itemIds: ['a'] },
      { id: 'time', kind: 'time', label: '2026-03', x: 0, y: 40, width: 112, height: 300, itemIds: ['a'] },
    ];
    const model = buildWhiteboardSemanticPresentationModel({ level: 'compact', zoom: 0.12, nodes: [], guides });
    expect(model.guides.get('goal')?.mode).toBe('label');
    expect([...model.guides.values()].some((entry) => entry.mode === 'dot')).toBe(true);
    const guideById = new Map(guides.map((guide) => [guide.id, guide]));
    const rects = [...model.guides.values()].map((entry) => {
      const guide = guideById.get(entry.id)!;
      const left = guide.x * 0.12 + entry.offsetScreenX; const top = guide.y * 0.12 + entry.offsetScreenY;
      return { left, top, right: left + entry.widthPx, bottom: top + entry.heightPx };
    });
    for (let i = 0; i < rects.length; i += 1) for (let j = i + 1; j < rects.length; j += 1) expect(overlaps(rects[i], rects[j])).toBe(false);
  });

  test('overview 保持相同 world anchor，只把卡片 presentation 降成固定屏幕 dot', () => {
    const model = buildWhiteboardSemanticPresentationModel({
      level: 'overview', zoom: 0.08,
      nodes: [{ id: 'a', kind: 'item', worldAnchor: { x: 1200, y: -300 }, label: '很长的标题不会在 overview 常驻显示' }],
    });
    const placement = model.items.get('a')!;
    expect(placement.worldAnchor).toEqual({ x: 1200, y: -300 });
    expect(placement.mode).toBe('dot');
    expect(placement.widthPx).toBeLessThanOrEqual(20);
  });
});
