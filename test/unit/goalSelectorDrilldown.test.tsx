/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F031/regression
 * @covers F031/ui
 * @covers F031/unit
 * @covers F040/ui
 * @covers F040/unit
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';

import { GoalSelector, type GoalSelectorOption } from '@/features/quickinput/editor/components/GoalSelector';

const goals: GoalSelectorOption[] = [
  { id: '照顾好自己', value: '照顾好自己', label: '照顾好自己', synthetic: true, order: 0 },
  { id: '我若安好便是晴天', value: '我若安好便是晴天', label: '我若安好便是晴天', synthetic: true, order: 1 },
  { id: '仪容仪表', value: '仪容仪表', label: '仪容仪表', synthetic: true, order: 2 },
  { id: '了解自我', value: '了解自我', label: '了解自我', synthetic: true, order: 3 },
  { id: '了解世界', value: '了解世界', label: '了解世界', synthetic: true, order: 4 },
  { id: '工作能力', value: '工作能力', label: '工作能力', synthetic: true, order: 5 },
  { id: '爱好能力', value: '爱好能力', label: '爱好能力', synthetic: true, order: 6 },
  { id: '武装大脑', value: '武装大脑', label: '武装大脑', synthetic: true, order: 7 },

  // Two different branches intentionally contain a Goal named “健康”.
  { id: '照顾好自己/思考/健康', value: '照顾好自己/思考/健康', label: '健康', order: 8 },
  { id: '照顾好自己/思考/专注', value: '照顾好自己/思考/专注', label: '专注', order: 9 },

  // Five levels deep to lock the selector to data-driven depth rather than 3 columns.
  { id: '仪容仪表/健康/卫生/个人护理/口腔', value: '仪容仪表/健康/卫生/个人护理/口腔', label: '口腔', order: 10 },
  { id: '仪容仪表/健康/睡眠', value: '仪容仪表/健康/睡眠', label: '睡眠', order: 11 },
];

function optionButtons(host: HTMLElement): HTMLButtonElement[] {
  return Array.from(host.querySelectorAll('button.think-quick-input-goal-row')) as HTMLButtonElement[];
}

function optionByPath(host: HTMLElement, path: string): HTMLButtonElement {
  const button = host.querySelector(`button.think-quick-input-goal-row[data-goal-path="${path}"]`) as HTMLButtonElement | null;
  if (!button) throw new Error(`missing option path: ${path}`);
  return button;
}

describe('GoalSelector inline root-first hierarchy UX', () => {
  let host: HTMLDivElement;
  beforeEach(() => {
    host = document.createElement('div');
    host.className = 'think-os think-quick-input-editor';
    document.body.appendChild(host);
  });
  afterEach(() => { render(null, host); host.remove(); });

  it('shows every first-level Goal immediately as one-line rows and has no search UI', async () => {
    await act(async () => render(<GoalSelector goals={goals} onSelect={jest.fn()} />, host));

    const labels = optionButtons(host).map((button) => button.querySelector('.think-combobox-option__label')?.textContent?.trim());
    expect(labels).toEqual([
      '照顾好自己',
      '我若安好便是晴天',
      '仪容仪表',
      '了解自我',
      '了解世界',
      '工作能力',
      '爱好能力',
      '武装大脑',
    ]);
    expect(host.querySelector('input')).toBeNull();
    expect(host.textContent).not.toContain('搜索');
    expect(host.textContent).not.toContain('最近使用');
    expect(host.textContent).not.toContain('仅导航');
    expect(host.querySelectorAll('[aria-label^="目标第"]')).toHaveLength(1);
    expect(host.querySelectorAll('.think-quick-input-selectable-pill')).toHaveLength(0);
  });

  it('keeps prior levels visible and opens deeper levels beside them', async () => {
    await act(async () => render(<GoalSelector goals={goals} onSelect={jest.fn()} />, host));

    await act(async () => optionByPath(host, '仪容仪表').click());
    expect(optionByPath(host, '仪容仪表/健康')).toBeTruthy();
    expect(host.querySelectorAll('[aria-label^="目标第"]')).toHaveLength(2);

    await act(async () => optionByPath(host, '仪容仪表/健康').click());
    expect(optionByPath(host, '仪容仪表/健康/卫生')).toBeTruthy();
    expect(host.querySelectorAll('[aria-label^="目标第"]')).toHaveLength(3);
  });

  it('supports arbitrary hierarchy depth beyond three columns', async () => {
    await act(async () => render(<GoalSelector goals={goals} onSelect={jest.fn()} />, host));

    await act(async () => optionByPath(host, '仪容仪表').click());
    await act(async () => optionByPath(host, '仪容仪表/健康').click());
    await act(async () => optionByPath(host, '仪容仪表/健康/卫生').click());
    await act(async () => optionByPath(host, '仪容仪表/健康/卫生/个人护理').click());

    expect(host.querySelectorAll('[aria-label^="目标第"]')).toHaveLength(5);
    expect(optionByPath(host, '仪容仪表/健康/卫生/个人护理/口腔')).toBeTruthy();
  });

  it('makes the active ancestry and selected Goal distinguishable even when labels repeat', async () => {
    const onSelect = jest.fn();
    await act(async () => render(
      <GoalSelector goals={goals} selectedGoalPath="照顾好自己/思考/健康" onSelect={onSelect} />,
      host,
    ));

    const root = optionByPath(host, '照顾好自己');
    const parent = optionByPath(host, '照顾好自己/思考');
    const selected = optionByPath(host, '照顾好自己/思考/健康');

    expect(root.getAttribute('aria-current')).toBe('true');
    expect(parent.getAttribute('aria-current')).toBe('true');
    expect(selected.getAttribute('aria-current')).toBe('true');
    expect(selected.getAttribute('aria-selected')).toBe('true');
    expect(selected.title).toBe('照顾好自己 › 思考 › 健康');
    expect(host.querySelector('.think-quick-input-goal-active-path')?.textContent).toBe('照顾好自己 › 思考 › 健康');

    // A different branch can expose another “健康”, but the path remains explicit.
    await act(async () => optionByPath(host, '仪容仪表').click());
    const otherHealth = optionByPath(host, '仪容仪表/健康');
    expect(otherHealth.title).toBe('仪容仪表 › 健康');
    expect(otherHealth.getAttribute('aria-selected')).toBe('false');
    expect(host.querySelector('.think-quick-input-goal-active-path')?.textContent).toBe('仪容仪表');
  });

  it('selects only a real Goal, never a navigation-only ancestor', async () => {
    const onSelect = jest.fn();
    await act(async () => render(<GoalSelector goals={goals} onSelect={onSelect} />, host));

    await act(async () => optionByPath(host, '仪容仪表').click());
    await act(async () => optionByPath(host, '仪容仪表/健康').click());
    expect(onSelect).not.toHaveBeenCalled();

    await act(async () => optionByPath(host, '仪容仪表/健康/卫生').click());
    expect(onSelect).not.toHaveBeenCalled();

    await act(async () => optionByPath(host, '仪容仪表/健康/卫生/个人护理').click());
    expect(onSelect).not.toHaveBeenCalled();

    await act(async () => optionByPath(host, '仪容仪表/健康/卫生/个人护理/口腔').click());
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ value: '仪容仪表/健康/卫生/个人护理/口腔' }));
  });
});
