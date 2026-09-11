/**
 * @covers F098/unit
 * @covers F098/regression
 */
import {
  centerWhiteboardCameraOnWorldPoint,
  createWhiteboardPanSession,
  getWhiteboardWorldTransform,
  resolveWhiteboardPannedCamera,
  resolveWhiteboardWheelPannedCamera,
  resolveWhiteboardZoomedCamera,
  screenToWhiteboardWorld,
  worldToWhiteboardScreen,
} from '@/features/whiteboard/WhiteboardCameraModel';

describe('白板 world / camera / screen 纯模型 1.1.5', () => {
  test('screen↔world 在负 camera + zoom 下可逆，world 不依赖固定左上原点', () => {
    const camera = { x: -400, y: 200 };
    const viewport = { left: 100, top: 50 };
    const world = { x: -250, y: 100 };
    const screen = worldToWhiteboardScreen(world, viewport, camera, 1.5);
    expect(screen).toEqual({ clientX: 325, clientY: -100 });
    expect(screenToWhiteboardWorld(screen, viewport, camera, 1.5)).toEqual(world);
  });

  test('拖动空白处可向四向推进 camera，包括进入负 world', () => {
    const session = createWhiteboardPanSession({ pointerId: 7, clientX: 100, clientY: 100, camera: { x: 0, y: 0 }, zoom: 2 });
    expect(resolveWhiteboardPannedCamera(session, 300, -100)).toEqual({ x: -100, y: 100 });
    expect(resolveWhiteboardPannedCamera(session, -100, 300)).toEqual({ x: 100, y: -100 });
    expect(resolveWhiteboardWheelPannedCamera({ x: -50, y: 20 }, 100, -40, 2)).toEqual({ x: 0, y: 0 });
  });

  test('Zoom + Pan 组合时，缩放锚点下的 world 点保持不动', () => {
    const nextCamera = resolveWhiteboardZoomedCamera({
      camera: { x: -100, y: 50 },
      currentZoom: 1,
      nextZoom: 2,
      anchorOffsetX: 400,
      anchorOffsetY: 300,
    });
    expect(nextCamera).toEqual({ x: 100, y: 200 });
    const before = screenToWhiteboardWorld({ clientX: 400, clientY: 300 }, { left: 0, top: 0 }, { x: -100, y: 50 }, 1);
    const after = screenToWhiteboardWorld({ clientX: 400, clientY: 300 }, { left: 0, top: 0 }, nextCamera, 2);
    expect(after).toEqual(before);
  });

  test('定位卡片只通过 camera 把 world 点带到 viewport 中心', () => {
    expect(centerWhiteboardCameraOnWorldPoint({
      point: { x: -500, y: 700 },
      viewportWidth: 800,
      viewportHeight: 600,
      zoom: 2,
    })).toEqual({ x: -700, y: 550 });
  });

  test('world layer transform 只由 ephemeral camera + zoom 构成', () => {
    expect(getWhiteboardWorldTransform({ x: -100, y: 50 }, 2)).toBe('matrix(2,0,0,2,200,-100)');
  });
});
