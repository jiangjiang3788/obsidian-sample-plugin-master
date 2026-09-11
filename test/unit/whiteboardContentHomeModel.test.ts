/**
 * @covers F098/unit
 * @covers F098/regression
 * @covers F142/unit
 * @covers F142/regression
 */
import { getWhiteboardCanvasHomePoint } from '@/features/whiteboard/WhiteboardContentBoundsModel';

describe('Whiteboard 1.2.5 R3 内容找回模型', () => {
  test('远端离群卡片不会把 100% 回中点落在没有任何内容的几何中心', () => {
    const home = getWhiteboardCanvasHomePoint([
      { id: 'near', recordId: 'near', x: 100, y: 100 },
      { id: 'far', recordId: 'far', x: 1_000_000, y: 1_000_000 },
    ]);
    expect(home).toEqual({ x: 224, y: 230 });
  });

  test('只有工作台时 home 落在真实工作台基础 frame 内，不依赖被远端成员撑大的 frame 中心', () => {
    const home = getWhiteboardCanvasHomePoint([], [
      { id: 'group-a', title: '工作台 A', x: -360, y: -240, collapsed: false },
    ]);
    expect(home).toEqual({ x: 0, y: 0 });
  });

  test('当前子画布完全空时保留 controller 提供的工作台 fallback home', () => {
    expect(getWhiteboardCanvasHomePoint([], [], [], { x: 500, y: -200 })).toEqual({ x: 500, y: -200 });
  });
});
