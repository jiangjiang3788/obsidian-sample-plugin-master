/**
 * @covers F099/ui
 * @covers F099/regression
 * @covers F138/ui
 * @covers F138/regression
 * @covers F142/ui
 * @covers F142/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { createPointerEvent, waitForUi } from '../support/uiTestUtils';
import type { RecordViewItem } from '@core/types/public';
import { DEFAULT_WHITEBOARD_ID, WhiteboardStore } from '@core/whiteboard/public';
import type { IPluginStorage } from '@/core/services/StorageService';
import { WhiteboardWorkspace } from '@/features/whiteboard/WhiteboardWorkspace';

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function persistentMemoryStorage() {
  const files = new Map<string, unknown>();
  const storage: IPluginStorage = {
    readJSON: async <T,>(path: string): Promise<T | null> => files.has(path) ? clone(files.get(path)) as T : null,
    writeJSON: jest.fn(async (path, value) => { files.set(path, clone(value)); }),
    remove: jest.fn(async (path) => { files.delete(path); }),
  };
  return { files, storage };
}
function record(id: string): RecordViewItem {
  return { id, recordType: 'thought', title: id, content: `${id} content`, tags: [], goalPath: '测试/白板', date: '2026-09-09', created: 0, modified: 0, extra: {} } as RecordViewItem;
}
function pointer(type: string, pointerId: number, clientX: number, clientY: number): PointerEvent {
  return createPointerEvent(type, { pointerId, pointerType: 'mouse', button: 0, clientX, clientY });
}
async function setupNestedStore(storage: IPluginStorage) {
  const store = new WhiteboardStore(storage); await store.initialize();
  const parent = await store.createGroup(DEFAULT_WHITEBOARD_ID, '一级工作台', { x: 100, y: 100 });
  const child = await store.createGroup(DEFAULT_WHITEBOARD_ID, '二级工作台', { x: 240, y: 220 }, parent.id);
  return { store, parent, child };
}

describe('Whiteboard 1.2.5 R2 Nested Workbench 可靠性回归', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  it('进入二级工作台后始终可通过顶部按钮、Esc 和根白板按钮退出，不会被困在子画布', async () => {
    const h = persistentMemoryStorage(); const { store, parent, child } = await setupNestedStore(h.storage);
    await act(async () => render(<WhiteboardWorkspace records={[]} whiteboardStore={store} />, host));
    const parentEnter = host.querySelector(`[data-whiteboard-group-id="${parent.id}"] button[aria-label="全屏进入工作台"]`) as HTMLButtonElement;
    await act(async () => parentEnter.click());
    const childEnter = host.querySelector(`[data-whiteboard-group-id="${child.id}"] button[aria-label="全屏进入工作台"]`) as HTMLButtonElement;
    await act(async () => childEnter.click());
    const workspace = host.querySelector('.think-whiteboard-workspace') as HTMLElement;
    expect(workspace.dataset.whiteboardActiveGroupId).toBe(child.id);
    expect(host.querySelector('button[aria-label="返回上一级工作台"]')).toBeTruthy();
    expect(host.querySelector('button[aria-label="退出到根白板"]')).toBeTruthy();

    await act(async () => (host.querySelector('button[aria-label="返回上一级工作台"]') as HTMLButtonElement).click());
    expect(workspace.dataset.whiteboardActiveGroupId).toBe(parent.id);
    await act(async () => (host.querySelector(`[data-whiteboard-group-id="${child.id}"] button[aria-label="全屏进入工作台"]`) as HTMLButtonElement).click());
    await act(async () => workspace.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(workspace.dataset.whiteboardActiveGroupId).toBe(parent.id);
    await act(async () => (host.querySelector(`[data-whiteboard-group-id="${child.id}"] button[aria-label="全屏进入工作台"]`) as HTMLButtonElement).click());
    await act(async () => (host.querySelector('button[aria-label="退出到根白板"]') as HTMLButtonElement).click());
    expect(workspace.dataset.whiteboardActiveGroupId).toBe('');
  });

  it('左侧 Record 在二级全屏工作台可直接拖入，落盘 item.groupId 指向当前工作台', async () => {
    const h = persistentMemoryStorage(); const { store, parent, child } = await setupNestedStore(h.storage); const rec = record('nested-source-drop');
    await act(async () => render(<WhiteboardWorkspace records={[rec]} whiteboardStore={store} />, host));
    await act(async () => (host.querySelector(`[data-whiteboard-group-id="${parent.id}"] button[aria-label="全屏进入工作台"]`) as HTMLButtonElement).click());
    await waitForUi(() => (host.querySelector('.think-whiteboard-workspace') as HTMLElement | null)?.dataset.whiteboardActiveGroupId === parent.id, '等待进入一级工作台');
    await act(async () => (host.querySelector(`[data-whiteboard-group-id="${child.id}"] button[aria-label="全屏进入工作台"]`) as HTMLButtonElement).click());
    await waitForUi(() => (host.querySelector('.think-whiteboard-workspace') as HTMLElement | null)?.dataset.whiteboardActiveGroupId === child.id, '等待进入二级工作台');
    const viewport = host.querySelector('.think-whiteboard-canvas-viewport') as HTMLDivElement;
    viewport.getBoundingClientRect = () => ({ left: 320, top: 80, right: 1320, bottom: 780, width: 1000, height: 700, x: 320, y: 80, toJSON: () => ({}) });
    Object.defineProperties(viewport, { clientWidth: { configurable: true, value: 1000 }, clientHeight: { configurable: true, value: 700 } });
    const source = host.querySelector(`[data-whiteboard-source-record-id="${rec.id}"]`) as HTMLElement;
    await act(async () => {
      source.dispatchEvent(pointer('pointerdown', 71, 100, 140));
      window.dispatchEvent(pointer('pointermove', 71, 720, 420));
      window.dispatchEvent(pointer('pointerup', 71, 720, 420));
    });
    await waitForUi(() => (store.getBoard(DEFAULT_WHITEBOARD_ID)?.items.length ?? 0) === 1, '等待二级工作台单条拖入落盘');
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.items).toEqual([expect.objectContaining({ recordId: rec.id, groupId: child.id })]);
    expect(host.querySelector(`[data-whiteboard-source-record-id="${rec.id}"]`)).toBeNull();
    expect(host.querySelector(`[data-whiteboard-item-id]`)).toBeTruthy();
  });


  it('二级全屏工作台支持左侧多选批量拖入，并且整批 membership 都指向当前工作台', async () => {
    const h = persistentMemoryStorage(); const { store, parent, child } = await setupNestedStore(h.storage);
    const records = [record('nested-batch-a'), record('nested-batch-b')];
    await act(async () => render(<WhiteboardWorkspace records={records} whiteboardStore={store} />, host));
    await act(async () => (host.querySelector(`[data-whiteboard-group-id="${parent.id}"] button[aria-label="全屏进入工作台"]`) as HTMLButtonElement).click());
    await waitForUi(() => (host.querySelector('.think-whiteboard-workspace') as HTMLElement | null)?.dataset.whiteboardActiveGroupId === parent.id, '等待进入一级工作台');
    await act(async () => (host.querySelector(`[data-whiteboard-group-id="${child.id}"] button[aria-label="全屏进入工作台"]`) as HTMLButtonElement).click());
    await waitForUi(() => (host.querySelector('.think-whiteboard-workspace') as HTMLElement | null)?.dataset.whiteboardActiveGroupId === child.id, '等待进入二级工作台');
    const viewport = host.querySelector('.think-whiteboard-canvas-viewport') as HTMLDivElement;
    viewport.getBoundingClientRect = () => ({ left: 320, top: 80, right: 1320, bottom: 780, width: 1000, height: 700, x: 320, y: 80, toJSON: () => ({}) });
    Object.defineProperties(viewport, { clientWidth: { configurable: true, value: 1000 }, clientHeight: { configurable: true, value: 700 } });
    await act(async () => (host.querySelector('.think-whiteboard-source__selection-bar button') as HTMLButtonElement).click());
    await waitForUi(() => host.textContent?.includes('已选 2') === true, '等待 Record Source 全选');
    expect(host.textContent).toContain('已选 2');
    const source = host.querySelector('[data-whiteboard-source-record-id="nested-batch-a"]') as HTMLElement;
    await act(async () => {
      source.dispatchEvent(pointer('pointerdown', 72, 100, 160));
      window.dispatchEvent(pointer('pointermove', 72, 760, 460));
      window.dispatchEvent(pointer('pointerup', 72, 760, 460));
    });
    await waitForUi(() => (store.getBoard(DEFAULT_WHITEBOARD_ID)?.items.length ?? 0) === 2, '等待二级工作台批量拖入落盘');
    const saved = store.getBoard(DEFAULT_WHITEBOARD_ID)?.items ?? [];
    expect(saved).toHaveLength(2);
    expect(saved.map((item) => item.recordId).sort()).toEqual(['nested-batch-a', 'nested-batch-b']);
    expect(saved.every((item) => item.groupId === child.id)).toBe(true);
  });

  it('重启只重置 ephemeral 子画布导航到根白板，已拖入二级工作台的 durable membership 仍恢复', async () => {
    const h = persistentMemoryStorage(); const first = await setupNestedStore(h.storage); const item = await first.store.addRecord(DEFAULT_WHITEBOARD_ID, 'restart-nested', { x: 300, y: 300 }, first.child.id);
    await act(async () => render(<WhiteboardWorkspace records={[record('restart-nested')]} whiteboardStore={first.store} />, host));
    await act(async () => (host.querySelector(`[data-whiteboard-group-id="${first.parent.id}"] button[aria-label="全屏进入工作台"]`) as HTMLButtonElement).click());
    await act(async () => (host.querySelector(`[data-whiteboard-group-id="${first.child.id}"] button[aria-label="全屏进入工作台"]`) as HTMLButtonElement).click());
    expect((host.querySelector('.think-whiteboard-workspace') as HTMLElement).dataset.whiteboardActiveGroupId).toBe(first.child.id);
    render(null, host); first.store.dispose();

    const restarted = new WhiteboardStore(h.storage); await restarted.initialize();
    await act(async () => render(<WhiteboardWorkspace records={[record('restart-nested')]} whiteboardStore={restarted} />, host));
    expect((host.querySelector('.think-whiteboard-workspace') as HTMLElement).dataset.whiteboardActiveGroupId).toBe('');
    expect(restarted.getBoard(DEFAULT_WHITEBOARD_ID)?.items).toEqual([expect.objectContaining({ id: item.id, groupId: first.child.id, x: 300, y: 300 })]);
    expect(host.querySelector('[data-whiteboard-source-record-id="restart-nested"]')).toBeNull();
    await act(async () => (host.querySelector(`[data-whiteboard-group-id="${first.parent.id}"] button[aria-label="全屏进入工作台"]`) as HTMLButtonElement).click());
    await act(async () => (host.querySelector(`[data-whiteboard-group-id="${first.child.id}"] button[aria-label="全屏进入工作台"]`) as HTMLButtonElement).click());
    expect(host.querySelector(`[data-whiteboard-item-id="${item.id}"]`)).toBeTruthy();
  });
});
