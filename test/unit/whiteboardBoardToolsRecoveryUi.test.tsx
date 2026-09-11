/**
 * @covers F142/ui
 * @covers F142/regression
 * @covers F098/ui
 * @covers F098/regression
 * @covers F153/ui
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { WhiteboardBoardTools } from '@/features/whiteboard/WhiteboardBoardTools';
import type { WhiteboardFindController } from '@/features/whiteboard/WhiteboardFindController';

const find: WhiteboardFindController = {
  query: '', setQuery: jest.fn(), matchIds: [], matchSet: new Set(), activeItemId: null,
  active: false, index: 0, inputRef: { current: null }, step: jest.fn(), handleWorkspaceKeyDown: jest.fn(),
};

describe('Whiteboard 1.2.5 R3 顶部恢复与子画布退出入口', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  test('只要 activeCanvasId 存在，即使标题/路径暂时缺失也必须渲染父级与根白板退出按钮', async () => {
    await act(async () => render(<WhiteboardBoardTools sourceCollapsed={false} onToggleSource={jest.fn()} gridVisible={false} onToggleGrid={jest.fn()} find={find} zoom={1}
      onZoomIn={jest.fn()} onZoomOut={jest.fn()} onResetZoom={jest.fn()} onCenterBoard={jest.fn()} onFitBoard={jest.fn()}
      archiveCount={0} archiveOpen={false} onToggleArchive={jest.fn()} onCreateWorkbench={jest.fn()} selectionCount={0} onClearSelection={jest.fn()}
      activeCanvasId="group-child" activeCanvasTitle={null} onExitCanvas={jest.fn()} onExitToRoot={jest.fn()} />, host));
    expect(host.querySelector('button[aria-label="返回上一级工作台"]')).toBeTruthy();
    expect(host.querySelector('button[aria-label="退出到根白板"]')).toBeTruthy();
  });

  test('任何层级都提供 100% 找回与 Fit Content 两个独立恢复动作', async () => {
    const center = jest.fn(); const fit = jest.fn();
    await act(async () => render(<WhiteboardBoardTools sourceCollapsed={false} onToggleSource={jest.fn()} gridVisible={false} onToggleGrid={jest.fn()} find={find} zoom={0.005}
      onZoomIn={jest.fn()} onZoomOut={jest.fn()} onResetZoom={jest.fn()} onCenterBoard={center} onFitBoard={fit}
      archiveCount={0} archiveOpen={false} onToggleArchive={jest.fn()} onCreateWorkbench={jest.fn()} selectionCount={0} onClearSelection={jest.fn()} />, host));
    await act(async () => (host.querySelector('button[aria-label="回到画布中心"]') as HTMLButtonElement).click());
    await act(async () => (host.querySelector('button[aria-label="适配当前画布内容"]') as HTMLButtonElement).click());
    expect(center).toHaveBeenCalledTimes(1); expect(fit).toHaveBeenCalledTimes(1);
  });
  test('网格是独立显示偏好，按钮只触发显式切换', async () => {
    const toggleGrid = jest.fn();
    await act(async () => render(<WhiteboardBoardTools sourceCollapsed={true} onToggleSource={jest.fn()} gridVisible={false} onToggleGrid={toggleGrid} find={find} zoom={1}
      onZoomIn={jest.fn()} onZoomOut={jest.fn()} onResetZoom={jest.fn()} onCenterBoard={jest.fn()} onFitBoard={jest.fn()}
      archiveCount={0} archiveOpen={false} onToggleArchive={jest.fn()} onCreateWorkbench={jest.fn()} selectionCount={0} onClearSelection={jest.fn()} />, host));
    const grid = host.querySelector('button[aria-label="显示白板网格"]') as HTMLButtonElement;
    expect(grid).toBeTruthy();
    expect(host.querySelector('button[aria-label="展开记录栏"]')).toBeTruthy();
    await act(async () => grid.click());
    expect(toggleGrid).toHaveBeenCalledTimes(1);
  });

});
