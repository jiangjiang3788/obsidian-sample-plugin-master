/**
 * @covers F142/ui
 * @covers F142/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import type { WhiteboardGroup } from '@core/whiteboard/public';
import { WhiteboardCanvasBreadcrumbs } from '@/features/whiteboard/WhiteboardCanvasBreadcrumbs';

const path: WhiteboardGroup[] = [
  { id: 'a', title: '产品', x: 0, y: 0, collapsed: false },
  { id: 'b', title: '研究', x: 0, y: 0, collapsed: false, parentGroupId: 'a' },
];

describe('Whiteboard 1.2.5 子画布导航 UI', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  test('提供 Back/Forward/父级/路径/Fit content，并标记当前层', async () => {
    const onBack = jest.fn(); const onForward = jest.fn(); const onParent = jest.fn(); const onFit = jest.fn(); const onEnter = jest.fn();
    await act(async () => render(<WhiteboardCanvasBreadcrumbs path={path} canGoBack canGoForward onBack={onBack} onForward={onForward} onParent={onParent} onFitContent={onFit} onEnter={onEnter} />, host));
    expect(host.textContent).toContain('白板'); expect(host.textContent).toContain('产品'); expect(host.textContent).toContain('研究');
    expect(host.querySelector('[data-whiteboard-breadcrumb-group-id="b"]')?.getAttribute('aria-current')).toBe('page');
    await act(async () => (host.querySelector('button[aria-label="返回上次画布"]') as HTMLButtonElement).click()); expect(onBack).toHaveBeenCalledTimes(1);
    await act(async () => (host.querySelector('button[aria-label="前进到下次画布"]') as HTMLButtonElement).click()); expect(onForward).toHaveBeenCalledTimes(1);
    await act(async () => (host.querySelector('button[aria-label="返回父工作台"]') as HTMLButtonElement).click()); expect(onParent).toHaveBeenCalledTimes(1);
    await act(async () => (host.querySelector('button[aria-label="适配当前工作台内容"]') as HTMLButtonElement).click()); expect(onFit).toHaveBeenCalledTimes(1);
    await act(async () => (host.querySelector('button[aria-label="退出到根白板"]') as HTMLButtonElement).click()); expect(onEnter).toHaveBeenCalledWith(null);
  });
});
