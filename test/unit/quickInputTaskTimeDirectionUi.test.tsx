/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F042/ui
 * @covers F126/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';

import { QuickInputEditorFields } from '@/features/quickinput/editor/components/Fields';
import {
  buildQuickInputDisplayTemplate,
  shouldShowQuickInputTimeDirectionControl,
} from '@/features/quickinput/editor/model/displayTemplate';

describe('Task QuickInput 反向时间界面', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    render(null, host);
    host.remove();
  });

  it('Task 主表单渲染反向开关，并把 canonical 时间字段放在同一时间区', async () => {
    const template = buildQuickInputDisplayTemplate({
      id: 'core.task',
      recordTypeId: 'core.task',
      fields: [
        { id: 'body', key: '任务内容', label: '内容', type: 'text', semantic: 'body' },
      ],
    }, 'core.task', [], { taskTimingMode: 'execution' })!;

    const onDirectionChange = jest.fn();
    await act(async () => render(
      <QuickInputEditorFields
        getResourcePath={(path) => path}
        template={template}
        formData={{}}
        onUpdateField={() => {}}
        timeDirection="backward"
        onTimeDirectionChange={onDirectionChange}
        showTimeDirectionControl={shouldShowQuickInputTimeDirectionControl(template)}
      />,
      host,
    ));

    const checkbox = host.querySelector('.think-qif-time-direction input[type="checkbox"]') as HTMLInputElement | null;
    expect(checkbox).toBeTruthy();
    expect(checkbox?.checked).toBe(true);
    expect(host.textContent).toContain('反向（结束时间 - 时长 = 开始时间）');
    expect(host.querySelectorAll('.think-qif-time-grid input')).toHaveLength(3);

    await act(async () => checkbox?.click());
    expect(onDirectionChange).toHaveBeenCalledWith('forward');
  });
});
