/**
 * @covers F151/unit
 * @covers F151/regression
 */
import type { WhiteboardGroup, WhiteboardItem } from '@core/whiteboard/public';
import { arrangeWhiteboardNodes } from '@/features/whiteboard/WhiteboardNodeArrangeModel';

const item = (id: string, x: number, y: number, groupId?: string): WhiteboardItem => ({ id, recordId: `rec-${id}`, x, y, ...(groupId ? { groupId } : {}) });
const group = (id: string, x: number, y: number, parentGroupId?: string): WhiteboardGroup => ({ id, title: id, x, y, collapsed: false, ...(parentGroupId ? { parentGroupId } : {}) });

describe('Whiteboard 1.3.5 低倍率混合节点整理模型', () => {
  test('Card + Workbench 作为当前层原子节点网格整理，Workbench 尺寸参与避让', () => {
    const rootCard = item('root', 900, 500); const workbench = group('group-a', 100, 100); const nestedCard = item('nested', 150, 180, workbench.id);
    const result = arrangeWhiteboardNodes({ targetItems: [rootCard], targetGroups: [workbench], allItems: [rootCard, nestedCard], allGroups: [workbench], mode: 'grid' });
    expect(result.itemMoves).toHaveLength(1); expect(result.groupMoves).toHaveLength(1);
    const cardMove = result.itemMoves[0].position; const groupMove = result.groupMoves[0].position;
    expect(cardMove.y).toBe(groupMove.y); expect(cardMove.x).not.toBe(groupMove.x);
    expect(Number.isFinite(cardMove.x)).toBe(true); expect(Number.isFinite(groupMove.x)).toBe(true);
  });

  test('混合节点对齐/分布只改变目标轴，并保留卡片 zIndex', () => {
    const a = { ...item('a', 900, 500), zIndex: 7 }; const b = item('b', 300, 100); const g = group('g', -200, 700);
    const top = arrangeWhiteboardNodes({ targetItems: [a, b], targetGroups: [g], allItems: [a, b], allGroups: [g], mode: 'align-top' });
    const ys = [...top.itemMoves.map((move) => move.position.y), ...top.groupMoves.map((move) => move.position.y)]; expect(new Set(ys).size).toBe(1);
    expect(top.itemMoves.find((move) => move.itemId === a.id)?.position.zIndex).toBe(7);
    expect(top.itemMoves.find((move) => move.itemId === a.id)?.position.x).toBe(900);
    const horizontal = arrangeWhiteboardNodes({ targetItems: [a, b], targetGroups: [g], allItems: [a, b], allGroups: [g], mode: 'distribute-horizontal' });
    const xs = [...horizontal.itemMoves.map((move) => move.position.x), ...horizontal.groupMoves.map((move) => move.position.x)].sort((x, y) => x - y);
    expect(xs[0]).toBe(-200); expect(xs.at(-1)).toBe(900);
  });
});
