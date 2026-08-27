/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F090/ui
 * @covers F090/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { RuleBuilder } from '@/features/settings/views/editors/RuleBuilder';

const dataStore = {
  queryItems: () => [
    { id: '1', content: '第一条', status: 'open', coreBlock: 'task' },
    { id: '2', content: '第二条', status: 'done', coreBlock: 'task' },
  ],
} as any;

describe('筛选规则编辑器界面', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  it('已有高级规则以中文字段语义显示，点击规则只删除对应一条且保持其他规则', async () => {
    const onChange = jest.fn();
    const rows = [
      { field: 'content', op: 'includes', value: '第一条', logic: 'and' },
      { field: 'status', op: '=', value: 'done' },
    ] as any[];

    await act(async () => render(
      <RuleBuilder
        title="筛选"
        mode="filter"
        rows={rows}
        fieldOptions={['content', 'status', 'coreBlock']}
        onChange={onChange}
        dataStore={dataStore}
      />,
      host,
    ));

    expect(host.textContent).toContain('内容');
    expect(host.textContent).toContain('状态');
    expect(host.textContent).toContain('第一条');

    const chips = host.querySelectorAll('button.think-chip');
    expect(chips).toHaveLength(2);
    await act(async () => (chips[0] as HTMLButtonElement).click());

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ field: 'status', op: '=', value: 'done' }),
    ]);
  });
});
