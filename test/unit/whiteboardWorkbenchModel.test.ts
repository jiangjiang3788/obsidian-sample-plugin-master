/**
 * @covers F099/unit
 * @covers F099/regression
 * @covers F134/unit
 * @covers F134/regression
 */
import type { WhiteboardGroup, WhiteboardItem } from '@core/whiteboard/public';
import {
  WHITEBOARD_WORKBENCH_COLLAPSED_WIDTH_PX,
  WHITEBOARD_WORKBENCH_HEADER_HEIGHT_PX,
  WHITEBOARD_WORKBENCH_MIN_HEIGHT_PX,
  WHITEBOARD_WORKBENCH_MIN_WIDTH_PX,
  createWhiteboardWorkbenchDragSession,
  getNextWhiteboardWorkbenchTitle,
  getWhiteboardWorkbenchCreatePosition,
  getWhiteboardWorkbenchDropTargetId,
  getWhiteboardWorkbenchHitTargetId,
  getWhiteboardWorkbenchHomePoint,
  getWhiteboardWorkbenchPointHitTargetId,
  getWhiteboardWorkbenchFrame,
  resolveWhiteboardWorkbenchDragPreview,
  translateWhiteboardWorkbenchMembers,
} from '@/features/whiteboard/WhiteboardWorkbenchModel';

const group = (overrides: Partial<WhiteboardGroup> = {}): WhiteboardGroup => ({
  id: 'group-a', title: '工作台 1', x: -400, y: -200, collapsed: false, ...overrides,
});
const item = (overrides: Partial<WhiteboardItem> = {}): WhiteboardItem => ({
  id: 'item-a', recordId: 'rec-a', x: -340, y: -120, groupId: 'group-a', ...overrides,
});

describe('Whiteboard Workbench 1.1.7 纯模型', () => {
  test('工作台 frame 有最小尺寸，并会向右下自动包住成员卡片；折叠后只保留标题条', () => {
    const expanded = getWhiteboardWorkbenchFrame(group(), [item({ x: 500, y: 420 })]);
    expect(expanded.width).toBeGreaterThan(WHITEBOARD_WORKBENCH_MIN_WIDTH_PX);
    expect(expanded.height).toBeGreaterThan(WHITEBOARD_WORKBENCH_MIN_HEIGHT_PX);
    const collapsed = getWhiteboardWorkbenchFrame(group({ collapsed: true }), [item({ x: 500, y: 420 })]);
    expect(collapsed).toMatchObject({ width: WHITEBOARD_WORKBENCH_COLLAPSED_WIDTH_PX, height: WHITEBOARD_WORKBENCH_HEADER_HEIGHT_PX });
  });

  test('新建工作台围绕当前 viewport world 中心放置，负 camera 与 zoom 下不回夹到零', () => {
    const position = getWhiteboardWorkbenchCreatePosition({ camera: { x: -1000, y: -500 }, zoom: 2, viewportWidth: 800, viewportHeight: 600 });
    expect(position).toEqual({ x: -1160, y: -590 });
  });

  test('未分组卡片落入展开工作台会加入；已有成员拖出 frame 时仍保留当前组，需显式移出', () => {
    const groups = [group()];
    expect(getWhiteboardWorkbenchDropTargetId(groups, [], { x: -300, y: -100 }, null)).toBe('group-a');
    expect(getWhiteboardWorkbenchDropTargetId(groups, [item()], { x: 1000, y: 1000 }, 'group-a')).toBe('group-a');
    expect(getWhiteboardWorkbenchHitTargetId(groups, [item()], { x: 1000, y: 1000 })).toBeNull();
    expect(getWhiteboardWorkbenchHitTargetId(groups, [item()], { x: -300, y: -100 })).toBe('group-a');
    expect(getWhiteboardWorkbenchDropTargetId([group({ collapsed: true })], [], { x: -300, y: -100 }, null)).toBeNull();
  });

  test('Source drop 以指针 world 点命中工作台，靠近右下边缘时不会因为卡片中心偏移而误落到根白板', () => {
    const groups = [group({ x: 100, y: 100 })];
    const frame = getWhiteboardWorkbenchFrame(groups[0], [], groups);
    const pointerNearBottomRight = { x: frame.right - 4, y: frame.bottom - 4 };
    expect(getWhiteboardWorkbenchPointHitTargetId(groups, [], pointerNearBottomRight)).toBe('group-a');
    expect(getWhiteboardWorkbenchHitTargetId(groups, [], { x: pointerNearBottomRight.x, y: pointerNearBottomRight.y })).toBeNull();
  });

  test('整组拖动使用 screen delta / zoom，并且 preview 只平移该组成员', () => {
    const session = createWhiteboardWorkbenchDragSession({ group: group(), pointerId: 7, clientX: 100, clientY: 100, zoom: 2 });
    expect(resolveWhiteboardWorkbenchDragPreview(session, 103, 102)).toBeNull();
    expect(resolveWhiteboardWorkbenchDragPreview(session, 300, 200)).toEqual({ x: -300, y: -150 });
    const translated = translateWhiteboardWorkbenchMembers([item(), item({ id: 'item-b', recordId: 'rec-b', groupId: undefined, x: 20, y: 30 })], 'group-a', 50, -20);
    expect(translated[0]).toMatchObject({ x: -290, y: -140 });
    expect(translated[1]).toMatchObject({ x: 20, y: 30 });
  });


  test('工作台导航 home 优先真实内容而不是被远端成员拉到空白几何中心', () => {
    const home = getWhiteboardWorkbenchHomePoint(group({ x: 0, y: 0 }), [
      item({ x: 60, y: 80 }),
      item({ id: 'far', recordId: 'far', x: 1_000_000, y: 1_000_000 }),
    ], [group({ x: 0, y: 0 })]);
    expect([
      { x: 184, y: 210 },
      { x: 1_000_124, y: 1_000_130 },
    ]).toContainEqual(home);
  });

  test('默认命名选择第一个未占用的“工作台 N”', () => {
    expect(getNextWhiteboardWorkbenchTitle([group(), group({ id: 'group-b', title: '工作台 3' })])).toBe('工作台 2');
  });
});
