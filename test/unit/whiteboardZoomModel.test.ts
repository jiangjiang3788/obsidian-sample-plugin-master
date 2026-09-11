/**
 * @covers F097/unit
 * @covers F097/regression
 * @covers F098/regression
 */
import {
  WHITEBOARD_ZOOM_MAX,
  WHITEBOARD_ZOOM_MIN,
  clampWhiteboardZoom,
  formatWhiteboardZoomPercent,
  resolveWhiteboardWheelZoom,
  stepWhiteboardZoom,
} from '@/features/whiteboard/WhiteboardZoomModel';
import { resolveWhiteboardZoomedCamera } from '@/features/whiteboard/WhiteboardCameraModel';
import { createWhiteboardDragSession, resolveWhiteboardDragPreview } from '@/features/whiteboard/WhiteboardDragModel';
import { resolveWhiteboardCanvasDropPosition } from '@/features/whiteboard/WhiteboardTransferModel';

const item = { id: 'item-1', recordId: 'rec-1', x: 100, y: 80, zIndex: 2 };

describe('白板缩放纯模型 1.1.4 → 1.1.5 回归', () => {
  test('1.1.5 将旧 50%～200% 扩成实用近无限范围，按钮使用倍率步进', () => {
    expect(clampWhiteboardZoom(0)).toBe(WHITEBOARD_ZOOM_MIN);
    expect(clampWhiteboardZoom(0.0001)).toBe(WHITEBOARD_ZOOM_MIN);
    expect(clampWhiteboardZoom(1000)).toBe(WHITEBOARD_ZOOM_MAX);
    expect(stepWhiteboardZoom(1, 1)).toBe(1.25);
    expect(stepWhiteboardZoom(1, -1)).toBe(0.8);
    expect(stepWhiteboardZoom(0.5, -1)).toBe(0.4);
    expect(stepWhiteboardZoom(2, 1)).toBe(2.5);
    expect(formatWhiteboardZoomPercent(0.005)).toBe('0.5%');
    expect(formatWhiteboardZoomPercent(128)).toBe('12800%');
  });

  test('Ctrl/Command + wheel 使用连续指数缩放，而不是每次固定 10%', () => {
    expect(resolveWhiteboardWheelZoom(1, 120)).toBeCloseTo(0.74082, 4);
    expect(resolveWhiteboardWheelZoom(1, -120)).toBeCloseTo(1.34986, 4);
    expect(resolveWhiteboardWheelZoom(WHITEBOARD_ZOOM_MIN, 10_000)).toBe(WHITEBOARD_ZOOM_MIN);
    expect(resolveWhiteboardWheelZoom(WHITEBOARD_ZOOM_MAX, -10_000)).toBe(WHITEBOARD_ZOOM_MAX);
  });

  test('1.1.5 用 camera 取代 scroll 后，缩放仍围绕 viewport 锚点稳定', () => {
    expect(resolveWhiteboardZoomedCamera({
      camera: { x: 200, y: 100 },
      currentZoom: 1,
      nextZoom: 1.5,
      anchorOffsetX: 400,
      anchorOffsetY: 300,
    })).toEqual({ x: 333.33333333333337, y: 200 });
  });

  test('卡片拖动使用逻辑坐标：200% 下屏幕移动 100px 只改变 50 world 像素', () => {
    const session = createWhiteboardDragSession({ item, pointerId: 1, clientX: 300, clientY: 200, activeZIndex: 9 });
    expect(resolveWhiteboardDragPreview(session, 400, 260, 2)).toEqual({ x: 150, y: 110, zIndex: 9 });
  });

  test('Source drop 同样做 screen→world 换算，缩放不污染 durable XY', () => {
    expect(resolveWhiteboardCanvasDropPosition({
      point: { clientX: 700, clientY: 500 },
      viewport: { left: 300, top: 100, right: 1300, bottom: 900, camera: { x: 100, y: 50 } },
      zIndex: 4,
      zoom: 2,
    })).toEqual({ x: 276, y: 226, zIndex: 4 });
  });
});
