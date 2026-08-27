/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F089/integration
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { dayjs } from '@core/public';
import { ViewToolbar } from '@/features/views/runtime/ViewToolbar';

describe('视图工具栏日期与粒度交互', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  it('真实工具栏把上一范围、下一范围、今天和时间粒度变化传给上层', async () => {
    const onDateChange = jest.fn();
    const onViewChange = jest.fn();
    await act(async () => render(
      <ViewToolbar
        currentView="周"
        currentDate={dayjs('2026-08-24')}
        onViewChange={onViewChange}
        onDateChange={onDateChange}
        viewInstances={[]}
      />,
      host,
    ));

    expect(host.querySelector('[aria-label="时间范围导航"]')).toBeTruthy();
    await act(async () => (host.querySelector('button[aria-label="上一时间范围"]') as HTMLButtonElement).click());
    await act(async () => (host.querySelector('button[aria-label="下一时间范围"]') as HTMLButtonElement).click());
    await act(async () => (host.querySelector('button[aria-label="回到今天"]') as HTMLButtonElement).click());

    expect(onDateChange).toHaveBeenNthCalledWith(1, expect.objectContaining({}));
    expect(onDateChange.mock.calls[0][0].format('YYYY-MM-DD')).toBe('2026-08-17');
    expect(onDateChange.mock.calls[1][0].format('YYYY-MM-DD')).toBe('2026-08-31');
    expect(onDateChange).toHaveBeenCalledTimes(3);

    const month = [...host.querySelectorAll('button')].find((button) => button.textContent?.trim() === '月') as HTMLButtonElement;
    await act(async () => month.click());
    expect(onViewChange).toHaveBeenCalledWith('月');
  });
});
