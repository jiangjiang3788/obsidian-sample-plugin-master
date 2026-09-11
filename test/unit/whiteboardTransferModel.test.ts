/**
 * @covers F095/unit
 * @covers F095/regression
 * @covers F097/unit
 * @covers F098/unit
 * @covers F098/regression
 */
import {
  createWhiteboardSourceDragSession,
  isWhiteboardClientPointInsideRect,
  isWhiteboardSourceDragActivated,
  resolveWhiteboardCanvasDropPosition,
} from '@/features/whiteboard/WhiteboardTransferModel';

describe('白板左右直接拖模型', () => {
  test('左侧 Record 低于阈值仍是普通点击/滚动，超过阈值才进入拖入白板状态', () => {
    const session = createWhiteboardSourceDragSession(7, 100, 100);
    expect(isWhiteboardSourceDragActivated(session, { clientX: 103, clientY: 103 })).toBe(false);
    expect(isWhiteboardSourceDragActivated(session, { clientX: 106, clientY: 100 })).toBe(true);
  });

  test('1.1.4 兼容：camera=0 时 drop 仍按 viewport + zoom 反算 world', () => {
    expect(resolveWhiteboardCanvasDropPosition({
      point: { clientX: 620, clientY: 430 },
      viewport: { left: 300, top: 100, right: 1300, bottom: 900, camera: { x: 0, y: 0 } },
      zIndex: 9,
    })).toEqual({ x: 296, y: 306, zIndex: 9 });
  });

  test('任意 zoom + camera 下 Source drop 直接得到可为负的 world 坐标', () => {
    expect(resolveWhiteboardCanvasDropPosition({
      point: { clientX: 500, clientY: 300 },
      viewport: { left: 300, top: 100, right: 1300, bottom: 900, camera: { x: -500, y: -200 } },
      zIndex: 4,
      zoom: 2,
    })).toEqual({ x: -424, y: -124, zIndex: 4 });
  });

  test('靠近 viewport 左上角不再夹紧到 0；camera 决定真实 world 落点', () => {
    expect(resolveWhiteboardCanvasDropPosition({
      point: { clientX: 301, clientY: 101 },
      viewport: { left: 300, top: 100, right: 1300, bottom: 900, camera: { x: -80, y: -40 } },
      zIndex: 2,
    })).toEqual({ x: -103, y: -63, zIndex: 2 });
  });

  test('右侧卡拖回左栏只由 client point 是否落在 Source rect 决定', () => {
    const rect = { left: 0, top: 0, right: 340, bottom: 900 };
    expect(isWhiteboardClientPointInsideRect({ clientX: 120, clientY: 400 }, rect)).toBe(true);
    expect(isWhiteboardClientPointInsideRect({ clientX: 500, clientY: 400 }, rect)).toBe(false);
  });
});
