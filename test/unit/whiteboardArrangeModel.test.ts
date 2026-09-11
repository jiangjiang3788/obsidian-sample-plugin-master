/**
 * @covers F141/unit
 * @covers F141/regression
 */
import type { WhiteboardEdge, WhiteboardItem } from '@core/whiteboard/public';
import { arrangeWhiteboardItems } from '@/features/whiteboard/WhiteboardArrangeModel';

const item = (id: string, x: number, y: number): WhiteboardItem => ({ id, recordId: `rec-${id}`, x, y });

describe('Whiteboard 1.2.4 节点整理模型', () => {
  test('网格整理确定性展开且保留 zIndex；对齐/等距不改变非目标轴', () => {
    const items = [{ ...item('a', 800, 500), zIndex: 9 }, item('b', 10, 70), item('c', 400, 30), item('d', 200, 900)];
    const grid = arrangeWhiteboardItems(items, 'grid');
    expect(grid).toHaveLength(4); expect(new Set(grid.map((entry) => `${entry.position.x}:${entry.position.y}`)).size).toBe(4);
    expect(grid.find((entry) => entry.itemId === 'a')?.position.zIndex).toBe(9);
    const left = arrangeWhiteboardItems(items, 'align-left'); expect(new Set(left.map((entry) => entry.position.x)).size).toBe(1);
    expect(left.find((entry) => entry.itemId === 'a')?.position.y).toBe(500);
    const horizontal = arrangeWhiteboardItems(items, 'distribute-horizontal').sort((a, b) => a.position.x - b.position.x);
    expect(horizontal[0].position.x).toBe(10); expect(horizontal.at(-1)?.position.x).toBe(800);
  });

  test('按连线整理把 A→B→C 放到递增列，循环节点也能稳定收口', () => {
    const items = [item('c', 30, 30), item('a', 400, 400), item('b', 200, 200), item('cycle', 600, 600)];
    const edges: WhiteboardEdge[] = [
      { id: 'ab', fromItemId: 'a', toItemId: 'b' }, { id: 'bc', fromItemId: 'b', toItemId: 'c' },
      { id: 'loop', fromItemId: 'cycle', toItemId: 'cycle' },
    ];
    const moves = arrangeWhiteboardItems(items, 'graph', edges); const byId = new Map(moves.map((entry) => [entry.itemId, entry.position]));
    expect(byId.get('a')!.x).toBeLessThan(byId.get('b')!.x); expect(byId.get('b')!.x).toBeLessThan(byId.get('c')!.x);
    expect(Number.isFinite(byId.get('cycle')!.x)).toBe(true);
  });
});
