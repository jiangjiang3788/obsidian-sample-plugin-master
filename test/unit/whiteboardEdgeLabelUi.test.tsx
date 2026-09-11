/**
 * @covers F140/ui
 * @covers F140/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { WhiteboardEdgeLayer } from '@/features/whiteboard/WhiteboardEdgeLayer';

describe('Whiteboard 1.2.3 连线标注 UI', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  test('边中点可直接添加/编辑 label，不需要 Edge 类型系统', async () => {
    const update = jest.fn(async () => true); const remove = jest.fn(async () => true);
    await act(async () => render(<WhiteboardEdgeLayer boardId="board" items={[{ id: 'a', recordId: 'a', x: 0, y: 0 }, { id: 'b', recordId: 'b', x: 400, y: 200 }]} edges={[{ id: 'edge', fromItemId: 'a', toItemId: 'b' }]} onRemoveEdge={remove} onUpdateEdgeLabel={update} />, host));
    const label = host.querySelector('button[aria-label="添加连线标注"]') as HTMLButtonElement; expect(label.textContent).toContain('标注');
    await act(async () => label.click()); const input = host.querySelector('input[aria-label="连线标注"]') as HTMLInputElement;
    await act(async () => { input.value = '支持'; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await Promise.resolve(); });
    expect(update).toHaveBeenCalledWith('edge', '支持');
  });
});
