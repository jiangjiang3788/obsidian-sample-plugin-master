/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F038/ui
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';

const mockNotice = jest.fn();
jest.mock('@/app/public', () => ({
  FloatingPanel: ({ children, title }: any) => <div class="e2e-floating-panel"><div>{title}</div>{children}</div>,
  useUiPort: () => ({ notice: mockNotice }),
}));

import { GoalTemplateEditorModal } from '@/features/settings/goalTemplates/GoalTemplateEditorModal';
import { getTemplateRecordTypeById } from '@core/recordTypes/public';
import { inputText, waitForUi } from '../support/uiTestUtils';

describe('GoalTemplate 编辑器界面', () => {
  let host: HTMLDivElement;
  beforeEach(() => { mockNotice.mockClear(); host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  it('新模板默认进入“模板”模式，保存时提交当前 Goal × RecordType 草稿', async () => {
    const upsertGoalTemplate = jest.fn(async () => {});
    const onClose = jest.fn();
    const block = getTemplateRecordTypeById('core.task')!;
    await act(async () => render(
      <GoalTemplateEditorModal
        isOpen
        onClose={onClose}
        goal={{ path: 'E2E/模板', status: 'active', createdAt: '', updatedAt: '' } as any}
        block={block}
        template={null}
        useCases={{ goal: { upsertGoalTemplate, deleteGoalTemplate: jest.fn() } } as any}
      />,
      host,
    ));

    expect(host.textContent).toContain('模板：');
    expect(host.textContent).toContain('E2E/模板');
    const target = [...host.querySelectorAll('.think-settings-row')]
      .find((row) => row.textContent?.includes('保存文件'))?.querySelector('input') as HTMLInputElement;
    await inputText(target, 'E2E/模板任务.md');

    const save = [...host.querySelectorAll('button')].find((button) => button.textContent?.trim() === '保存') as HTMLButtonElement;
    await act(async () => save.click());
    await waitForUi(() => upsertGoalTemplate.mock.calls.length === 1, '点击保存后模板用例没有收到保存请求');

    expect(upsertGoalTemplate).toHaveBeenCalledWith(expect.objectContaining({
      goalPath: 'E2E/模板', recordTypeId: 'core.task', targetFile: 'E2E/模板任务.md', enabled: true,
    }));
    expect(mockNotice).toHaveBeenCalledWith(expect.stringContaining('已保存模板'));
    expect(onClose).toHaveBeenCalled();
  });
});
