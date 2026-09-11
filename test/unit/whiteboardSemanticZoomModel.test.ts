/**
 * @covers F143/unit
 * @covers F143/regression
 * @covers F144/unit
 * @covers F144/regression
 */
import { getWhiteboardSemanticZoomState, getWhiteboardSemanticZoomStatus } from '@/features/whiteboard/WhiteboardSemanticZoomModel';

describe('Whiteboard 1.2.6-1.2.8 semantic zoom model', () => {
  test('detail / compact / overview switch representation before cards shrink into unreadable pixels', () => {
    expect(getWhiteboardSemanticZoomState(1).level).toBe('detail');
    const compact = getWhiteboardSemanticZoomState(0.2);
    expect(compact.level).toBe('compact');
    expect(compact.showCardLocators).toBe(true);
    expect(compact.showGroupLocators).toBe(true);
    expect(compact.showAnnotationLocators).toBe(false);

    const overview = getWhiteboardSemanticZoomState(0.05);
    expect(overview.level).toBe('overview');
    expect(overview.showCardLocators).toBe(true);
    expect(overview.showAnnotationLocators).toBe(true);
    expect(overview.zoom * overview.inverseZoom).toBeCloseTo(1, 8);
  });

  test('extreme minimum zoom still yields finite fixed-screen locator compensation', () => {
    const state = getWhiteboardSemanticZoomState(0.000001);
    expect(state.level).toBe('overview');
    expect(state.zoom).toBe(0.005);
    expect(state.inverseZoom).toBe(200);
    expect(Number.isFinite(state.inverseZoom)).toBe(true);
  });

  test('status explains compact and overview modes without changing durable data', () => {
    expect(getWhiteboardSemanticZoomStatus(getWhiteboardSemanticZoomState(1), 10, 2)).toBeNull();
    expect(getWhiteboardSemanticZoomStatus(getWhiteboardSemanticZoomState(0.2), 10, 2)).toContain('简化视图');
    expect(getWhiteboardSemanticZoomStatus(getWhiteboardSemanticZoomState(0.05), 10, 2)).toContain('10 卡片 · 2 工作台');
  });
});
