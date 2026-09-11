/**
 * @covers F153/ui
 * @covers F153/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import type { WhiteboardBoard, WhiteboardStore } from '@core/whiteboard/public';
import { WhiteboardWorkspace } from '@/features/whiteboard/WhiteboardWorkspace';
import { WHITEBOARD_UI_PREFERENCES_KEY } from '@/features/whiteboard/WhiteboardUiPreferences';

function fakeStore(): WhiteboardStore {
  const board: WhiteboardBoard = { title: '白板', modified: 1, items: [], edges: [] };
  return {
    getStatus: () => ({ state: 'ready' as const }),
    getBoard: () => board,
    subscribe: () => () => undefined,
    ensureBoard: async () => board,
    addRecord: jest.fn(), addRecords: jest.fn(), moveItem: jest.fn(), moveItems: jest.fn(), moveArchivedItems: jest.fn(), translateNodes: jest.fn(),
    removeItem: jest.fn(), removeItems: jest.fn(), archiveItems: jest.fn(), restoreArchivedItem: jest.fn(),
    createGroup: jest.fn(), renameGroup: jest.fn(), setGroupCollapsed: jest.fn(), moveGroup: jest.fn(), removeGroup: jest.fn(), bringItemToFront: jest.fn(),
    addEdge: jest.fn(), removeEdge: jest.fn(),
  } as unknown as WhiteboardStore;
}

describe('Whiteboard visual preferences persistence', () => {
  let host: HTMLDivElement;
  beforeEach(() => { localStorage.removeItem(WHITEBOARD_UI_PREFERENCES_KEY); host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); localStorage.removeItem(WHITEBOARD_UI_PREFERENCES_KEY); });

  test('网格默认关闭，用户打开后即使 Workspace 重挂载也保持', async () => {
    const store = fakeStore();
    await act(async () => render(<WhiteboardWorkspace records={[]} whiteboardStore={store} />, host));
    expect((host.querySelector('.think-whiteboard-canvas-viewport') as HTMLElement).dataset.whiteboardGrid).toBe('off');
    await act(async () => (host.querySelector('button[aria-label="显示白板网格"]') as HTMLButtonElement).click());
    expect((host.querySelector('.think-whiteboard-canvas-viewport') as HTMLElement).dataset.whiteboardGrid).toBe('on');

    await act(async () => render(null, host));
    await act(async () => render(<WhiteboardWorkspace records={[]} whiteboardStore={store} />, host));
    expect((host.querySelector('.think-whiteboard-canvas-viewport') as HTMLElement).dataset.whiteboardGrid).toBe('on');
  });

  test('用户收起左侧 Record Source 后，重挂载不会擅自重新展开', async () => {
    const store = fakeStore();
    await act(async () => render(<WhiteboardWorkspace records={[]} whiteboardStore={store} />, host));
    await act(async () => (host.querySelector('button[aria-label="收起记录栏"]') as HTMLButtonElement).click());
    expect(host.querySelector('.think-whiteboard-body')?.classList.contains('is-source-collapsed')).toBe(true);

    await act(async () => render(null, host));
    await act(async () => render(<WhiteboardWorkspace records={[]} whiteboardStore={store} />, host));
    expect(host.querySelector('.think-whiteboard-body')?.classList.contains('is-source-collapsed')).toBe(true);
    expect(host.querySelector('button[aria-label="展开记录栏"]')).toBeTruthy();
  });
});
