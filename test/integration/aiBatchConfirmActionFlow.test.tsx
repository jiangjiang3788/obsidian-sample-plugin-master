/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F073/integration
 * @covers F073/error
 */
/** @jsxImportSource preact */
import { render } from 'preact';
import { act } from 'preact/test-utils';
import type { RecordSubmitResult } from '@core/recordInput/public';
import type { AiBatchConfirmRecordItem } from '@/platform/obsidian/modals/AiBatchConfirmModel';
import { useAiBatchConfirmActions } from '@/platform/obsidian/modals/useAiBatchConfirmActions';

function record(id: string, content: string): AiBatchConfirmRecordItem {
  return {
    id,
    cmd: { rawText: content, target: { recordTypeId: 'core.task', goalPath: 'E2E/AI' }, fieldValues: { 内容: content } } as any,
    recordTypeId: 'core.task',
    goalLabel: 'AI',
    presetLabel: '已配置',
    formData: { 内容: content, goalPath: 'E2E/AI', 目标: 'E2E/AI' },
    editorContext: { goalPath: 'E2E/AI' },
    saved: false,
    skipped: false,
  };
}

describe('AI 批量确认动作组合链路', () => {
  let host: HTMLDivElement;
  let latest: ReturnType<typeof useAiBatchConfirmActions> | null = null;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    latest = null;
  });

  afterEach(() => {
    render(null, host);
    host.remove();
  });

  function mount(submitCreateRecord: (params: any) => Promise<RecordSubmitResult>) {
    function Harness() {
      latest = useAiBatchConfirmActions({
        initialRecords: [record('r1', '第一条'), record('r2', '第二条')],
        traceId: 'v6-batch',
        submitCreateRecord,
        closeModal: jest.fn(),
      });
      return <button id="save-all" onClick={() => void latest?.handleSaveAll()}>保存全部</button>;
    }
    render(<Harness />, host);
  }

  it('保存全部依次提交待处理记录，并把成功结果回写到批量确认状态', async () => {
    const submit = jest.fn(async () => ({ status: 'success', operation: 'create', refresh: { scanPaths: [], notify: true } } as RecordSubmitResult));
    mount(submit);

    await act(async () => {
      (host.querySelector('#save-all') as HTMLButtonElement).click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(submit).toHaveBeenCalledTimes(2);
    expect(latest?.summary).toEqual({ savedCount: 2, skippedCount: 0, pendingCount: 0 });
    expect(latest?.actionStatus.tone).toBe('success');
  });

  it('单条提交异常会留在待处理状态并给出明确失败状态，不会误标为已保存', async () => {
    const submit = jest.fn(async () => { throw new Error('模拟 AI 批量保存异常'); });
    mount(submit);

    await act(async () => {
      await latest?.handleSaveCurrent();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(latest?.records[0].saved).toBe(false);
    expect(latest?.summary.pendingCount).toBe(2);
    expect(latest?.actionStatus).toMatchObject({ tone: 'error' });
    expect(latest?.actionStatus.message).toContain('模拟 AI 批量保存异常');
  });
});
