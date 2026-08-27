/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F116/ui
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { useState } from 'preact/hooks';
import type { TemplateField } from '@core/types/public';
import { FieldsEditor } from '@/features/settings/input/FieldsEditor';
import { commitTextInput, inputText, waitForUi } from '../support/uiTestUtils';

function Harness({ onSnapshot }: { onSnapshot: (fields: TemplateField[]) => void }) {
  const [fields, setFields] = useState<TemplateField[]>([]);
  const update = (next: TemplateField[]) => { setFields(next); onSnapshot(next); };
  return <FieldsEditor fields={fields} onChange={update} />;
}

describe('FieldsEditor 字段编辑界面', () => {
  let host: HTMLDivElement;
  let latest: TemplateField[];
  beforeEach(() => { latest = []; host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  it('可以添加、改名、切换必填并删除自定义字段', async () => {
    await act(async () => render(<Harness onSnapshot={(fields) => { latest = fields; }} />, host));
    const add = [...host.querySelectorAll('button')].find((button) => button.textContent?.trim() === '添加字段') as HTMLButtonElement;
    await act(async () => add.click());
    expect(latest).toHaveLength(1);

    const name = host.querySelector('input[placeholder="字段名称"]') as HTMLInputElement;
    await inputText(name, '场景');
    await commitTextInput(name);
    await waitForUi(() => latest[0]?.key === '场景', '字段失焦后没有提交新名称');
    expect(latest[0]).toMatchObject({ key: '场景', label: '场景' });

    const required = host.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await act(async () => required.click());
    await waitForUi(() => latest[0]?.required === true, '点击必填复选框后没有更新字段');
    expect(latest[0].required).toBe(true);

    const remove = host.querySelector('button[aria-label="删除字段"]') as HTMLButtonElement;
    await act(async () => remove.click());
    await waitForUi(() => latest.length === 0, '删除字段后列表没有更新');
    expect(latest).toEqual([]);
  });

  it('保留非法/保留字段名警告，不允许用户误以为它是安全自定义字段', async () => {
    await act(async () => render(<Harness onSnapshot={(fields) => { latest = fields; }} />, host));
    const add = [...host.querySelectorAll('button')].find((button) => button.textContent?.trim() === '添加字段') as HTMLButtonElement;
    await act(async () => add.click());
    const name = host.querySelector('input[placeholder="字段名称"]') as HTMLInputElement;
    await inputText(name, '文件名');
    await waitForUi(() => Boolean(host.querySelector('.think-field-row__warning')?.textContent), '保留字段名警告没有出现');
    expect(host.querySelector('.think-field-row__warning')?.textContent).toBeTruthy();
  });
});
