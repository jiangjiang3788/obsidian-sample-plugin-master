/**
 * @covers F149/ui
 * @covers F149/regression
 * @covers F150/ui
 * @covers F150/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { createPointerEvent, waitForUi } from '../support/uiTestUtils';
import { WhiteboardSemanticLayoutOverlay } from '@/features/whiteboard/WhiteboardSemanticLayoutOverlay';
import type { WhiteboardSemanticLayoutGuide } from '@/features/whiteboard/WhiteboardSemanticLayoutModel';

describe('Whiteboard 1.3.3/1.3.4/1.3.7 语义布局交互', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  test('Goal / 类型 / 时间标题都可以把对应卡片集合直接选中', async () => {
    const onSelectItems = jest.fn();
    const guides: WhiteboardSemanticLayoutGuide[] = [
      { id: 'g', kind: 'goal', label: '目标 A', x: 0, y: 0, width: 900, height: 700, itemIds: ['a', 'b', 'c'] },
      { id: 't', kind: 'recordType', label: '任务', x: 120, y: 52, width: 300, height: 38, itemIds: ['b'] },
      { id: 'm', kind: 'time', label: '2026-09', x: 0, y: 90, width: 112, height: 240, itemIds: ['a', 'b'] },
    ];
    await act(async () => render(<WhiteboardSemanticLayoutOverlay guides={guides} onSelectItems={onSelectItems} />, host));
    const buttons = [...host.querySelectorAll('button')];
    await act(async () => buttons.find((button) => button.textContent === '目标 A')!.click());
    expect(onSelectItems).toHaveBeenLastCalledWith(['a', 'b', 'c']);
    await act(async () => buttons.find((button) => button.textContent === '任务')!.click());
    expect(onSelectItems).toHaveBeenLastCalledWith(['b']);
    await act(async () => buttons.find((button) => button.textContent === '2026-09')!.click());
    expect(onSelectItems).toHaveBeenLastCalledWith(['a', 'b']);
  });

  test('1.3.7 Goal / 类型 / 时间标签可拖动，低倍率也允许移到负坐标且边框跟随', async () => {
    const onSelectItems = jest.fn(); const onMoveGuide = jest.fn();
    const guides: WhiteboardSemanticLayoutGuide[] = [
      { id: 't', kind: 'recordType', label: '任务', x: 120, y: 52, width: 300, height: 38, itemIds: ['b'] },
    ];
    await act(async () => render(<WhiteboardSemanticLayoutOverlay guides={guides} zoom={0.1} onSelectItems={onSelectItems} onMoveGuide={onMoveGuide} />, host));
    const button = host.querySelector('button') as HTMLButtonElement;
    const pointer = (type: string, id: number, x: number, y: number) => { return createPointerEvent(type, {
      pointerId: id, pointerType: 'mouse', button: 0, clientX: x, clientY: y,
    }); };
    await act(async () => { button.dispatchEvent(pointer('pointerdown', 41, 100, 100)); window.dispatchEvent(pointer('pointermove', 41, 80, 130)); });
    await waitForUi(() => host.querySelector('[data-whiteboard-layout-guide-id="t"]')?.getAttribute('style')?.includes('left:-80px') === true, '等待语义标签拖动预览');
    const guide = host.querySelector('[data-whiteboard-layout-guide-id="t"]') as HTMLElement;
    expect(guide.getAttribute('style')).toContain('left:-80px');
    await act(async () => { window.dispatchEvent(pointer('pointerup', 41, 80, 130)); });
    await waitForUi(() => onMoveGuide.mock.calls.length > 0, '等待语义标签移动提交');
    expect(onMoveGuide).toHaveBeenCalledWith('t', { x: -80, y: 352 });
    await act(async () => button.click());
    expect(onSelectItems).not.toHaveBeenCalled();
  });

});
