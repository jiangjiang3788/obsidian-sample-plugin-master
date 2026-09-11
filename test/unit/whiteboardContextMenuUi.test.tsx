/**
 * @covers F141/ui
 * @covers F141/regression
 * @covers F149/ui
 * @covers F149/regression
 * @covers F151/ui
 * @covers F151/regression
 * @covers F153/ui
 * @covers F153/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { WhiteboardContextMenu } from '@/features/whiteboard/WhiteboardContextMenu';

describe('Whiteboard 1.2.4-1.3.5 右键整理菜单', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  test('卡片节点菜单提供网格/连线/语义/对齐/分布；空白菜单可整理当前层', async () => {
    const arrange = jest.fn(); const arrangeLayer = jest.fn(); const semanticArrange = jest.fn(); const noop = jest.fn();
    await act(async () => render(<WhiteboardContextMenu state={{ clientX: 10, clientY: 20, worldX: 1, worldY: 2, itemId: 'item-a' }} selectionCount={3} selectedItemCount={3} onClose={noop} onCreateText={noop} onCreateSticky={noop} onCreateWorkbench={noop} onCenter={noop} onWrapSelection={noop} onArrange={arrange} onArrangeCurrentLayer={arrangeLayer} onSemanticArrange={semanticArrange} />, host));
    expect(host.textContent).toContain('按连线整理'); expect(host.textContent).toContain('目标 × 类型 × 时间'); expect(host.textContent).toContain('用所选创建工作台'); expect(host.textContent).toContain('水平等距');
    await act(async () => (Array.from(host.querySelectorAll('button')).find((button) => button.textContent === '网格整理') as HTMLButtonElement).click());
    expect(arrange).toHaveBeenCalledWith('grid');
    await act(async () => render(<WhiteboardContextMenu state={{ clientX: 10, clientY: 20, worldX: 1, worldY: 2, itemId: null }} selectionCount={0} currentItemCount={3} currentGroupCount={2} onClose={noop} onCreateText={noop} onCreateSticky={noop} onCreateWorkbench={noop} onCenter={noop} onWrapSelection={noop} onArrange={arrange} onArrangeCurrentLayer={arrangeLayer} onSemanticArrange={semanticArrange} />, host));
    expect(host.textContent).toContain('添加文字标注'); expect(host.textContent).toContain('网格整理当前层'); expect(host.textContent).toContain('目标 × 类型 × 时间整理当前工作台'); expect(host.textContent).toContain('回到当前画布中心 · 100%');
  });

  test('低倍率 Card + Workbench 混选可网格/对齐/分布，但卡片专属语义和连线整理禁用', async () => {
    const arrange = jest.fn(); const noop = jest.fn();
    await act(async () => render(<WhiteboardContextMenu state={{ clientX: 30, clientY: 40, worldX: 3, worldY: 4, itemId: null, groupId: 'group-a' }} selectionCount={3} selectedItemCount={2} selectedGroupCount={1} onClose={noop} onCreateText={noop} onCreateSticky={noop} onCreateWorkbench={noop} onCenter={noop} onWrapSelection={noop} onArrange={arrange} onArrangeCurrentLayer={noop} onSemanticArrange={noop} />, host));
    expect(host.textContent).toContain('3 个节点 · 2 卡片 · 1 工作台');
    const buttons = Array.from(host.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.find((button) => button.textContent === '网格整理')?.disabled).toBe(false);
    expect(buttons.find((button) => button.textContent === '顶部对齐')?.disabled).toBe(false);
    expect(buttons.find((button) => button.textContent === '按连线整理')?.disabled).toBe(true);
    expect(buttons.find((button) => button.textContent === '目标 × 类型 × 时间')?.disabled).toBe(true);
    expect(buttons.find((button) => button.textContent === '用所选创建工作台')?.disabled).toBe(true);
    await act(async () => (buttons.find((button) => button.textContent === '顶部对齐') as HTMLButtonElement).click());
    expect(arrange).toHaveBeenCalledWith('align-top');
  });
  test('卡片低频动作收进右键菜单，不需要常驻在每张卡片上', async () => {
    const archive = jest.fn(); const remove = jest.fn(); const removeFromWorkbench = jest.fn(); const noop = jest.fn();
    await act(async () => render(<WhiteboardContextMenu state={{ clientX: 20, clientY: 30, worldX: 2, worldY: 3, itemId: 'item-a' }} selectionCount={1} selectedItemCount={1} selectedGroupCount={0} onClose={noop} onCreateText={noop} onCreateSticky={noop} onCreateWorkbench={noop} onCenter={noop} onWrapSelection={noop} onArrange={noop} onArrangeCurrentLayer={noop} onSemanticArrange={noop} onArchiveSelection={archive} onRemoveSelection={remove} onRemoveSelectionFromWorkbench={removeFromWorkbench} canRemoveSelectionFromWorkbench />, host));
    expect(host.textContent).toContain('归档');
    expect(host.textContent).toContain('移出白板');
    expect(host.textContent).toContain('移出工作台');
    await act(async () => (Array.from(host.querySelectorAll('button')).find((button) => button.textContent === '归档') as HTMLButtonElement).click());
    expect(archive).toHaveBeenCalledTimes(1);
  });

});
