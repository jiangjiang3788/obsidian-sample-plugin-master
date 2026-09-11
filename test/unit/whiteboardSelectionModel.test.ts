/**
 * @covers F135/unit
 * @covers F135/regression
 * @covers F148/unit
 * @covers F148/regression
 */
import {
  applyWhiteboardSelectionPreview,
  buildWhiteboardSelectionMoves,
  createWhiteboardMarqueeSession,
  getWhiteboardDirectGroups,
  getWhiteboardDirectItems,
  getWhiteboardGroupsIntersectingRect,
  getWhiteboardItemsIntersectingRect,
  mergeWhiteboardSelection,
  resolveWhiteboardMarqueeRects,
} from '@/features/whiteboard/WhiteboardSelectionModel';
import type { WhiteboardGroup, WhiteboardItem } from '@core/whiteboard/public';

function item(id: string, x: number, y: number, groupId?: string): WhiteboardItem {
  return { id, recordId: `rec-${id}`, x, y, zIndex: 2, ...(groupId ? { groupId } : {}) };
}

describe('Whiteboard Canvas selection 1.1.8 纯模型', () => {
  test('框选在负 camera + zoom 下仍按 screen→world 合同命中卡片', () => {
    const session = createWhiteboardMarqueeSession({
      pointerId: 4, clientX: 120, clientY: 90, viewportLeft: 100, viewportTop: 50,
      camera: { x: -500, y: -300 }, zoom: 2,
    });
    const rects = resolveWhiteboardMarqueeRects(session, 420, 390);
    expect(rects.screen).toMatchObject({ left: 20, top: 40, width: 300, height: 300 });
    expect(rects.world).toMatchObject({ left: -490, top: -280, right: -340, bottom: -130 });
    expect(getWhiteboardItemsIntersectingRect([
      item('a', -470, -260), item('b', -100, -100), item('c', -600, -500),
    ], rects.world)).toEqual(['a']);
  });

  test('Ctrl/⌘ 框选按需可和既有选择做并集', () => {
    expect([...mergeWhiteboardSelection(['old-a'], ['hit-b', 'old-a'])].sort()).toEqual(['hit-b', 'old-a']);
  });

  test('拖任意已选卡片按同一 world delta 预览整组，保留 Workbench membership 与相对位置', () => {
    const items = [item('a', -100, 20, 'group-a'), item('b', 200, 120), item('c', 900, 500)];
    const moves = buildWhiteboardSelectionMoves({
      items, selectedItemIds: new Set(['a', 'b']), draggedItemId: 'a', draggedPosition: { x: 50, y: -30, zIndex: 9 },
    });
    expect(moves).toEqual([
      { itemId: 'a', position: { x: 50, y: -30, zIndex: 9 } },
      { itemId: 'b', position: { x: 350, y: 70, zIndex: 2 } },
    ]);
    const preview = applyWhiteboardSelectionPreview(items, moves);
    expect(preview[0]).toMatchObject({ x: 50, y: -30, zIndex: 9, groupId: 'group-a' });
    expect(preview[1]).toMatchObject({ x: 350, y: 70 });
    expect(preview[2]).toMatchObject({ x: 900, y: 500 });
  });

  test('低倍率语义选择只暴露当前 Canvas 直属 Card + Workbench，父 Workbench 作为原子节点', () => {
    const items = [item('root-card', 10, 10), item('child-card', 130, 150, 'group-a'), item('grand-card', 330, 350, 'group-b')];
    const groups: WhiteboardGroup[] = [
      { id: 'group-a', title: 'A', x: 100, y: 100, collapsed: false },
      { id: 'group-b', title: 'B', x: 300, y: 300, collapsed: false, parentGroupId: 'group-a' },
    ];
    expect(getWhiteboardDirectItems(items, null).map((entry) => entry.id)).toEqual(['root-card']);
    expect(getWhiteboardDirectGroups(groups, null).map((entry) => entry.id)).toEqual(['group-a']);
    expect(getWhiteboardDirectItems(items, 'group-a').map((entry) => entry.id)).toEqual(['child-card']);
    expect(getWhiteboardDirectGroups(groups, 'group-a').map((entry) => entry.id)).toEqual(['group-b']);
    expect(getWhiteboardGroupsIntersectingRect(groups.slice(0, 1), items, { left: 90, top: 90, right: 500, bottom: 500 })).toEqual(['group-a']);
  });

});
