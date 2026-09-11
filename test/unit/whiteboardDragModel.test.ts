/**
 * @covers F094/unit
 * @covers F094/regression
 * @covers F097/unit
 * @covers F098/unit
 * @covers F098/regression
 */
import type { WhiteboardItem } from '@core/whiteboard/public';
import {
  WHITEBOARD_DRAG_THRESHOLD_PX,
  createWhiteboardDragSession,
  getNextWhiteboardZIndex,
  resolveWhiteboardDragPreview,
} from '@/features/whiteboard/WhiteboardDragModel';

function item(overrides: Partial<WhiteboardItem> = {}): WhiteboardItem {
  return { id: 'item-1', recordId: 'rec-1', x: 40, y: 60, zIndex: 2, ...overrides };
}

describe('白板拖动纯模型', () => {
  it('低于阈值保持点击语义，超过阈值才产生 XY preview', () => {
    const session = createWhiteboardDragSession({ item: item(), pointerId: 7, clientX: 100, clientY: 120, activeZIndex: 9 });
    expect(resolveWhiteboardDragPreview(session, 100 + WHITEBOARD_DRAG_THRESHOLD_PX - 1, 120)).toBeNull();
    expect(resolveWhiteboardDragPreview(session, 112, 136)).toEqual({ x: 52, y: 76, zIndex: 9 });
  });

  it('preview 基于 pointer-down 原坐标，不累计漂移', () => {
    const session = createWhiteboardDragSession({ item: item({ x: 10, y: 20 }), pointerId: 1, clientX: 50, clientY: 70, activeZIndex: 4 });
    expect(resolveWhiteboardDragPreview(session, 80, 100)).toEqual({ x: 40, y: 50, zIndex: 4 });
    expect(resolveWhiteboardDragPreview(session, 90, 120)).toEqual({ x: 50, y: 70, zIndex: 4 });
  });

  it('任意 zoom 下 screen delta 只换算 world delta，允许拖入负坐标', () => {
    const session = createWhiteboardDragSession({ item: item({ x: -100, y: -50 }), pointerId: 3, clientX: 300, clientY: 200, activeZIndex: 8 });
    expect(resolveWhiteboardDragPreview(session, 200, 140, 2)).toEqual({ x: -150, y: -80, zIndex: 8 });
  });

  it('层级只从当前白板 items 推导', () => {
    expect(getNextWhiteboardZIndex([item({ id: 'a', zIndex: 1 }), item({ id: 'b', zIndex: 8 }), item({ id: 'c', zIndex: undefined })])).toBe(9);
  });
});
