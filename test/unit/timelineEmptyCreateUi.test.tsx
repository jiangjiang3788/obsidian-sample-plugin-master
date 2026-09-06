/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F092/ui
 * @covers F126/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';

import { TimelineViewView } from '@/features/views/runtime/TimelineView/TimelineViewView';

describe('Timeline 空白时间轴创建入口', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    render(null, host);
    host.remove();
  });

  it('日常视图没有任务时仍渲染可点击时间列，用于创建第一个任务', async () => {
    const onColumnClick = jest.fn();
    const day = { format: () => '2026-08-26' };

    await act(async () => render(
      <TimelineViewView
        timelineTasksCount={0}
        isSummaryView={false}
        summaryData={[]}
        colorMap={{}}
        progressOrder={[]}
        untrackedLabel="未分类"
        zoomHandlers={{}}
        timeAxisWidth={90}
        summaryCategoryHours={{}}
        totalSummaryHours={0}
        dailyViewData={{
          dateRangeDays: [day],
          blocksByDay: { '2026-08-26': [] },
        } as any}
        categoriesConfig={{}}
        hourHeight={60}
        maxHours={24}
        onColumnClick={onColumnClick}
      />,
      host,
    ));

    expect(host.querySelector('.timeline-empty-state')).toBeNull();
    const body = host.querySelector('.day-column-body') as HTMLDivElement | null;
    expect(body).toBeTruthy();

    await act(async () => { body?.dispatchEvent(new MouseEvent('click', { bubbles: true, clientY: 120 })); });
    expect(onColumnClick).toHaveBeenCalledTimes(1);
    expect(onColumnClick.mock.calls[0][0]).toBe('2026-08-26');
  });

  it('年/季汇总视图没有任务时仍保持只读空状态', async () => {
    await act(async () => render(
      <TimelineViewView
        timelineTasksCount={0}
        isSummaryView={true}
        summaryData={[]}
        colorMap={{}}
        progressOrder={[]}
        untrackedLabel="未分类"
        zoomHandlers={{}}
        timeAxisWidth={90}
        summaryCategoryHours={{}}
        totalSummaryHours={0}
        dailyViewData={null}
        categoriesConfig={{}}
        hourHeight={60}
        maxHours={24}
        onColumnClick={() => {}}
      />,
      host,
    ));

    expect(host.textContent).toContain('当前范围内没有数据。');
    expect(host.querySelector('.day-column-body')).toBeNull();
  });
});
