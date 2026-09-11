/**
 * @covers F142/unit
 * @covers F142/regression
 */
import type { WhiteboardGroup, WhiteboardItem } from '@core/whiteboard/public';
import { fitWhiteboardBoundsToViewport } from '@/features/whiteboard/WhiteboardCameraModel';
import { getWhiteboardCanvasContentBounds } from '@/features/whiteboard/WhiteboardContentBoundsModel';
import {
  createWhiteboardCanvasNavigationHistory,
  getWhiteboardCanvasNavigationTarget,
  getWhiteboardItemPathLabel,
  pushWhiteboardCanvasNavigation,
  stepWhiteboardCanvasNavigation,
} from '@/features/whiteboard/WhiteboardNestedNavigationModel';

const groups: WhiteboardGroup[] = [
  { id: 'a', title: '产品', x: 100, y: 100, collapsed: false },
  { id: 'b', title: '研究', x: 900, y: 180, collapsed: false, parentGroupId: 'a' },
];

const item: WhiteboardItem = { id: 'i', recordId: 'r', x: 1200, y: 260, groupId: 'b' };

describe('Whiteboard 1.2.5 nested navigation / fit content 纯模型', () => {
  test('Back / Forward 保留浏览历史，分叉导航会清除旧 forward', () => {
    let history = createWhiteboardCanvasNavigationHistory();
    history = pushWhiteboardCanvasNavigation(history, 'a');
    history = pushWhiteboardCanvasNavigation(history, 'b');
    history = stepWhiteboardCanvasNavigation(history, -1);
    expect(getWhiteboardCanvasNavigationTarget(history)).toBe('a');
    history = stepWhiteboardCanvasNavigation(history, 1);
    expect(getWhiteboardCanvasNavigationTarget(history)).toBe('b');
    history = stepWhiteboardCanvasNavigation(history, -1);
    history = pushWhiteboardCanvasNavigation(history, null);
    expect(history.entries).toEqual([null, 'a', null]);
  });

  test('Nested Find 路径明确展示白板到目标工作台', () => {
    expect(getWhiteboardItemPathLabel(item, groups)).toBe('白板 › 产品 › 研究');
    expect(getWhiteboardItemPathLabel({ ...item, groupId: undefined }, groups)).toBe('白板');
  });

  test('Fit content 包住空子工作台和 Annotation，且不会把小内容放大超过 100%', () => {
    const bounds = getWhiteboardCanvasContentBounds([], [groups[1]], [{ id: 'note', kind: 'sticky', text: '说明', x: -300, y: -120 }]);
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBe(-300);
    expect(bounds!.right).toBeGreaterThanOrEqual(1620);
    const fitted = fitWhiteboardBoundsToViewport({ bounds: bounds!, viewportWidth: 1000, viewportHeight: 700, padding: 50, maxZoom: 1 });
    expect(fitted.zoom).toBeLessThanOrEqual(1);
    expect(Number.isFinite(fitted.camera.x)).toBe(true);
    expect(Number.isFinite(fitted.camera.y)).toBe(true);
  });
});
