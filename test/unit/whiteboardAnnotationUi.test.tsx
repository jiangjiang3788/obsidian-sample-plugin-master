/**
 * @covers F139/ui
 * @covers F139/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { commitTextInput, createPointerEvent, inputText, waitForUi } from '../support/uiTestUtils';
import { WhiteboardAnnotation } from '@/features/whiteboard/WhiteboardAnnotation';

describe('Whiteboard 1.2.2/1.3.7 空间标注 UI', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  test('文字/便签不是 Record 卡片；双击就地编辑并可删除', async () => {
    const update = jest.fn(async () => true); const remove = jest.fn(async () => true); const move = jest.fn(async () => true);
    await act(async () => render(<WhiteboardAnnotation annotation={{ id: 'note-1', kind: 'sticky', text: '旧说明', x: -20, y: 40 }} zoom={1} onUpdate={update} onMove={move} onRemove={remove} />, host));
    const note = host.querySelector('[data-whiteboard-annotation-id="note-1"]') as HTMLElement;
    expect(note.classList.contains('is-sticky')).toBe(true); expect(host.querySelector('[data-whiteboard-item-id]')).toBeNull();
    await act(async () => note.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })));
    const editor = host.querySelector('textarea') as HTMLTextAreaElement; expect(editor).toBeTruthy();
    await inputText(editor, '新的空间说明');
    await commitTextInput(editor);
    await waitForUi(() => update.mock.calls.length > 0, '等待标注编辑保存');
    expect(update).toHaveBeenCalledWith('note-1', '新的空间说明');
    const deleteButton = host.querySelector('button[aria-label="删除标注"]') as HTMLButtonElement;
    await act(async () => { deleteButton.click(); });
    await waitForUi(() => remove.mock.calls.length > 0, '等待标注删除');
    expect(remove).toHaveBeenCalledWith('note-1');
  });

  test('1.3.7 创建的文字标注可直接拖动，低倍率换算后可进入负坐标', async () => {
    const update = jest.fn(async () => true); const remove = jest.fn(async () => true); const move = jest.fn(async () => true);
    await act(async () => render(<WhiteboardAnnotation annotation={{ id: 'text-move', kind: 'text', text: '可移动文字', x: 40, y: 60 }} zoom={0.2} onUpdate={update} onMove={move} onRemove={remove} />, host));
    const note = host.querySelector('[data-whiteboard-annotation-id="text-move"]') as HTMLElement;
    const pointer = (type: string, id: number, x: number, y: number) => { return createPointerEvent(type, {
      pointerId: id, pointerType: 'mouse', button: 0, clientX: x, clientY: y,
    }); };
    // Dispatch PointerEvent-like events through the element/window; 40px screen-left at 20% = 200 world-left.
    await act(async () => { note.dispatchEvent(pointer('pointerdown', 51, 200, 120)); window.dispatchEvent(pointer('pointermove', 51, 160, 120)); window.dispatchEvent(pointer('pointerup', 51, 160, 120)); });
    await waitForUi(() => move.mock.calls.length > 0, '等待标注拖动保存');
    expect(move).toHaveBeenCalledWith('text-move', { x: -160, y: 60, zIndex: undefined });
  });

});
