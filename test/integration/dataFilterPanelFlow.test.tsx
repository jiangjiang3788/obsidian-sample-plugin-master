/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F090/integration
 * @covers F104/integration
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { DataFilterPanel } from '@/features/settings/layout/DataFilterPanel';

const items = [
  { id: '1', content: '关键字任务', status: 'open', recordType: 'task', goalPath: 'E2E' },
  { id: '2', content: '其他任务', status: 'done', recordType: 'task', goalPath: 'E2E' },
] as any[];

const dataStore = { queryItems: () => items } as any;

describe('布局全局数据筛选组合链路', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => {
    render(null, host);
    host.remove();
    document.getElementById('think-overlay-host')?.remove();
  });

  it('工具栏筛选按钮、已选规则、弹窗高级 RuleBuilder 和清空动作组成同一真实交互链', async () => {
    const onChange = jest.fn();
    const filters = [{ field: 'content', op: 'includes', value: '关键字' }] as any[];
    await act(async () => render(
      <DataFilterPanel dataStore={dataStore} items={items} filters={filters} onChange={onChange} />,
      host,
    ));

    expect(host.textContent).toContain('数据筛选 (1)');
    expect(host.textContent).toContain('关键字');

    const open = [...host.querySelectorAll('button')].find((button) => button.textContent?.includes('数据筛选')) as HTMLButtonElement;
    await act(async () => open.click());

    const dialog = document.querySelector('.think-data-filter-dialog') as HTMLElement;
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('全局数据筛选');
    expect(dialog.textContent).toContain('高级规则');
    expect(dialog.textContent).toContain('关键字');

    const clear = [...dialog.querySelectorAll('button')].find((button) => button.textContent?.trim() === '清空全部') as HTMLButtonElement;
    await act(async () => clear.click());
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
