/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F114/ui
 * @covers F114/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';

jest.mock('@features/settings/input/RecordTypeManager', () => ({ RecordTypeManager: () => <div data-test="记录类型页">记录类型页</div> }));
jest.mock('@features/settings/input/GoalManager', () => ({ GoalManager: () => <div data-test="目标页">目标页</div> }));
jest.mock('@features/settings/input/goalManager/GoalMetricSection', () => ({ GoalMetricSection: () => <div data-test="指标页">指标页</div> }));

import { DataManagementSettings } from '@/features/settings/tabs/DataManagementSettings';

describe('数据管理设置分区导航', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  it('默认进入目标页，并能在记录类型、目标、指标之间切换且只展示当前页', async () => {
    await act(async () => render(<DataManagementSettings />, host));
    const nav = host.querySelector('nav[aria-label="数据管理"]')!;
    expect(nav).toBeTruthy();
    expect(host.textContent).toContain('目标页');
    expect(host.textContent).not.toContain('记录类型页');

    const button = (label: string) => [...nav.querySelectorAll('button')].find((el) => el.textContent?.trim() === label) as HTMLButtonElement;
    await act(async () => button('记录类型').click());
    expect(host.textContent).toContain('记录类型页');
    expect(button('记录类型').getAttribute('aria-current')).toBe('page');

    await act(async () => button('指标').click());
    expect(host.textContent).toContain('指标页');
    expect(host.textContent).not.toContain('目标页');
    expect(button('指标').getAttribute('aria-current')).toBe('page');
  });
});
