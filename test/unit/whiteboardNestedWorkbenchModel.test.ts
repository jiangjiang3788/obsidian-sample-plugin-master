/**
 * @covers F138/unit
 * @covers F138/regression
 */
import type { WhiteboardGroup, WhiteboardItem } from '@core/whiteboard/public';
import { canNestWhiteboardGroup, getWhiteboardGroupDepth, getWhiteboardGroupPathIds } from '@core/whiteboard/public';
import {
  getWhiteboardWorkbenchFrame,
  getWhiteboardWorkbenchGroupsForContainer,
  getWhiteboardWorkbenchItemsForContainer,
  translateWhiteboardWorkbenchGroups,
  translateWhiteboardWorkbenchMembers,
} from '@/features/whiteboard/WhiteboardWorkbenchModel';

const groups: WhiteboardGroup[] = [
  { id: 'a', title: 'A', x: 0, y: 0, collapsed: false },
  { id: 'b', title: 'B', x: 100, y: 100, collapsed: false, parentGroupId: 'a' },
  { id: 'c', title: 'C', x: 200, y: 200, collapsed: false, parentGroupId: 'b' },
  { id: 'd', title: 'D', x: 300, y: 300, collapsed: false, parentGroupId: 'c' },
];
const items: WhiteboardItem[] = [
  { id: 'root-item', recordId: 'root', x: -100, y: -100 },
  { id: 'a-item', recordId: 'a-rec', x: 60, y: 80, groupId: 'a' },
  { id: 'd-item', recordId: 'd-rec', x: 360, y: 380, groupId: 'd' },
];

describe('Whiteboard Nested Workbench 1.2.1 纯模型', () => {
  test('路径和深度最多四层，第五层不能再挂到第四层', () => {
    expect(getWhiteboardGroupPathIds(groups, 'd')).toEqual(['a', 'b', 'c', 'd']);
    expect(getWhiteboardGroupDepth(groups, 'd')).toBe(4);
    expect(canNestWhiteboardGroup(groups, 'a', 'd')).toBe(false);
  });

  test('进入 Workbench 后只看当前子树；折叠父 Workbench 隐藏其后代', () => {
    expect(getWhiteboardWorkbenchGroupsForContainer(groups, 'a').map((group) => group.id)).toEqual(['b', 'c', 'd']);
    expect(getWhiteboardWorkbenchItemsForContainer(items, groups, 'a').map((item) => item.id)).toEqual(['a-item', 'd-item']);
    const collapsed = groups.map((group) => group.id === 'b' ? { ...group, collapsed: true } : group);
    expect(getWhiteboardWorkbenchGroupsForContainer(collapsed, 'a').map((group) => group.id)).toEqual(['b']);
    expect(getWhiteboardWorkbenchItemsForContainer(items, collapsed, 'a').map((item) => item.id)).toEqual(['a-item']);
  });

  test('父工作台 preview 平移时后代 Workbench 与成员保持相对位置，frame 会包住嵌套内容', () => {
    const movedGroups = translateWhiteboardWorkbenchGroups(groups, 'a', 500, -200);
    const movedItems = translateWhiteboardWorkbenchMembers(items, 'a', 500, -200, groups);
    expect(movedGroups.find((group) => group.id === 'd')).toMatchObject({ x: 800, y: 100 });
    expect(movedItems.find((item) => item.id === 'd-item')).toMatchObject({ x: 860, y: 180 });
    expect(movedItems.find((item) => item.id === 'root-item')).toMatchObject({ x: -100, y: -100 });
    const frame = getWhiteboardWorkbenchFrame(movedGroups[0], movedItems, movedGroups);
    expect(frame.right).toBeGreaterThan(860);
    expect(frame.bottom).toBeGreaterThan(180);
  });
});
