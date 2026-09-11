/**
 * @covers F099/unit
 * @covers F099/regression
 * @covers F134/unit
 * @covers F134/regression
 * @covers F149/regression
 */
import {
  getWhiteboardBoardContentCenter,
  resolveWhiteboardBatchPlacements,
} from '@/features/whiteboard/WhiteboardBatchPlacementModel';

describe('白板批量落点与画布中心 1.1.6', () => {
  test('批量 Record 从 drop world 点开始网格展开且 zIndex 连续', () => {
    const placements = resolveWhiteboardBatchPlacements(['a', 'b', 'c', 'd', 'e'], { x: -120, y: 80 }, 7);
    expect(placements).toHaveLength(5);
    expect(placements[0]).toEqual({ recordId: 'a', position: { x: -120, y: 80, zIndex: 7 } });
    expect(new Set(placements.map((entry) => `${entry.position.x}:${entry.position.y}`)).size).toBe(5);
    expect(placements.map((entry) => entry.position.zIndex)).toEqual([7, 8, 9, 10, 11]);
  });

  test('回到画布中心使用所有卡片包围盒中心，并支持负 world；空板回 world 原点', () => {
    expect(getWhiteboardBoardContentCenter([])).toEqual({ x: 0, y: 0 });
    expect(getWhiteboardBoardContentCenter([
      { id: 'a', recordId: 'a', x: -200, y: -100 },
      { id: 'b', recordId: 'b', x: 600, y: 300 },
    ])).toEqual({ x: 324, y: 230 });
  });
  test('回到画布中心也纳入空工作台 frame，不会把只有工作台的画布当成空白', () => {
    expect(getWhiteboardBoardContentCenter([], [{ id: 'group-a', title: '工作台 1', x: -360, y: -240, collapsed: false }])).toEqual({ x: 0, y: 0 });
  });
  test('折叠工作台按折叠后的可见 frame 参与画布中心，不被隐藏成员远坐标拉走', () => {
    expect(getWhiteboardBoardContentCenter(
      [{ id: 'item-a', recordId: 'rec-a', x: 4000, y: 3000, groupId: 'group-a' }],
      [{ id: 'group-a', title: '工作台 1', x: -180, y: -22, collapsed: true }],
    )).toEqual({ x: 0, y: 0 });
  });

});
