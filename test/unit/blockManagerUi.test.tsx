/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F115/ui
 * @covers F115/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { getEffectiveRecordTypes } from '@core/recordTypes/public';
import { RecordTypeManager } from '@/features/settings/input/RecordTypeManager';

describe('已注册记录类型查看器', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  it('展示统一注册表中的全部记录类型，并明确是代码注册的只读能力', async () => {
    await act(async () => render(<RecordTypeManager />, host));
    const registered = getEffectiveRecordTypes();
    expect(host.querySelectorAll('.think-block-accordion')).toHaveLength(registered.length);
    expect(host.textContent).toContain(`${registered.length} 个`);
    expect(host.textContent).toContain('记录类型由代码统一注册');
    for (const recordType of registered) expect(host.textContent).toContain(recordType.name);
    expect(host.textContent).not.toContain('新增记录类型');
    expect(host.textContent).not.toContain('删除记录类型');
  });

  it('展开普通记录类型后只显示中文记录类型名称与默认字段信息', async () => {
    await act(async () => render(<RecordTypeManager />, host));
    const recordType = getEffectiveRecordTypes().find((item) => item.captureMode === 'template' && item.id !== 'core.energy')!;
    const title = [...host.querySelectorAll<HTMLButtonElement>('.think-block-accordion__title')].find((button) => button.textContent?.trim() === recordType.name)!;
    await act(async () => title.click());
    expect(host.textContent).toContain('记录类型');
    expect(host.textContent).toContain(recordType.name);
    expect(host.textContent).not.toContain(recordType.id);
    expect(host.textContent).not.toContain(recordType.recordType);
  });
});
