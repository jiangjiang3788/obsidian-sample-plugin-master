const modalOpenMock = jest.fn();

jest.mock('@/app/ui/modals/QuickInputModal', () => ({
  QuickInputModal: jest.fn().mockImplementation(() => ({
    open: modalOpenMock,
  })),
}));

jest.mock('@core/public', () => {
  const dayjs = jest.requireActual<typeof import('dayjs')>('dayjs');
  const isoWeek = jest.requireActual<typeof import('dayjs/plugin/isoWeek')>('dayjs/plugin/isoWeek');
  const quarterOfYear = jest.requireActual<typeof import('dayjs/plugin/quarterOfYear')>('dayjs/plugin/quarterOfYear');
  dayjs.extend(isoWeek);
  dayjs.extend(quarterOfYear);

  return {
    dayjs,
    minutesToTime: (minutes: number) => {
      const h = Math.floor(minutes / 60).toString().padStart(2, '0');
      const m = Math.floor(minutes % 60).toString().padStart(2, '0');
      return `${h}:${m}`;
    },
    RECORD_TYPE_IDS: { TASK: 'core.task' },
    isRecordSubmitSuccess: (result: { status?: string }, options?: { treatCancelledAsSuccess?: boolean }) => {
      return result?.status === 'success' || (options?.treatCancelledAsSuccess && result?.status === 'cancelled');
    },
    readRecordSubmitMessage: (result: { feedback?: { notice?: string }; errors?: Array<{ message?: string }> }, fallback: string) => {
      return result?.feedback?.notice || result?.errors?.[0]?.message || fallback;
    },
  };
});

import {
  canCreateFromStatisticsCell,
  completeFromView,
  isModuleHeaderCreateAllowed,
  openCreateFromHeatmap,
  openCreateFromStatistics,
  openCreateFromTimeline,
  openCreateFromViewHeader,
  openEditFromItem,
  mergeRecordItemForEdit,
  updateTimelineRangeFromView,
} from '@/app/actions/recordUiActions';
import { QuickInputModal } from '@/app/ui/modals/QuickInputModal';
import { dayjs } from '@core/public';

describe('recordUiActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    modalOpenMock.mockClear();
  });

  it('allows only module headers with explicit create support', () => {
    expect(isModuleHeaderCreateAllowed('TimelineView')).toBe(true);
    expect(isModuleHeaderCreateAllowed('HeatmapView')).toBe(true);
    expect(isModuleHeaderCreateAllowed('StatisticsView')).toBe(true);
    expect(isModuleHeaderCreateAllowed('BlockView')).toBe(false);
  });

  it('requires a concrete statistics category before creating from a cell', () => {
    expect(canCreateFromStatisticsCell({ cellIdentifier: { category: '写作' } })).toBe(true);
    expect(canCreateFromStatisticsCell({ cellIdentifier: { category: '全部' } })).toBe(false);
    expect(canCreateFromStatisticsCell()).toBe(false);
  });

  it('builds a timeline create modal config from the clicked time slot', () => {
    const target = { getBoundingClientRect: () => ({ top: 100 }) };
    const event = { currentTarget: target, clientY: 190 } as unknown as MouseEvent;

    const opened = openCreateFromTimeline({
      app: { name: 'app' },
      uiPort: { notice: jest.fn() } as never,
      hourHeight: 60,
      maxHours: 24,
      dayBlocks: [
        { blockStartMinute: 40, blockEndMinute: 80 },
        { blockStartMinute: 120, blockEndMinute: 180 },
      ] as never,
      day: '2026-05-13',
      event,
    });

    expect(opened).toBe(true);
    expect(QuickInputModal).toHaveBeenCalledWith(
      { name: 'app' },
      'core.task',
      expect.objectContaining({
        日期: '2026-05-13',
        startAt: '2026-05-13T01:20',
        endAt: '2026-05-13T02:00',
        时间: '01:20',
        结束: '02:00',
        __recordUiContext: expect.objectContaining({
          kind: 'timeline_create',
          timeContext: expect.objectContaining({
            clickedMinute: 90,
            suggestedStartMinute: 80,
            suggestedEndMinute: 120,
            startSource: 'previous_block_end',
            endSource: 'next_block_start',
          }),
        }),
      }),
      undefined,
      false,
      expect.objectContaining({ mode: 'create', source: 'view_quick_create' }),
    );
    expect(modalOpenMock).toHaveBeenCalledTimes(1);
  });


  it('carries Heatmap date, Goal, content and rating context into QuickInput', () => {
    const opened = openCreateFromHeatmap({
      app: { name: 'app' },
      sourceRecordTypeId: 'core.habit',
      date: '2026-05-14',
      goalPath: '生活/健康',
      item: {
        id: 'habit-1',
        recordType: 'habit',
        goalPath: '生活/健康',
        content: '早睡',
        rating: 4,
        image: '⭐',
      } as never,
      notice: jest.fn(),
    });

    expect(opened).toBe(true);
    expect(QuickInputModal).toHaveBeenCalledWith(
      { name: 'app' },
      'core.habit',
      expect.objectContaining({
        日期: '2026-05-14',
        目标: '生活/健康',
        goalPath: '生活/健康',
        内容: '早睡',
        评分: { value: '⭐', label: '4' },
        __recordUiContext: expect.objectContaining({
          kind: 'heatmap_create',
          timeContext: { date: '2026-05-14' },
          goalContext: { goalPath: '生活/健康' },
        }),
      }),
      undefined,
      true,
      expect.objectContaining({ mode: 'create', source: 'view_quick_create' }),
    );
  });

  it('carries Statistics cell period/category/Goal/filter context into QuickInput', () => {
    const notice = jest.fn();
    const opened = openCreateFromStatistics({
      app: { name: 'app' },
      actionService: {} as never,
      uiPort: { notice } as never,
      viewInstance: {
        id: 'statistics-1',
        viewType: 'StatisticsView',
        filters: [{ field: 'status', op: '=', value: 'open' }],
      } as never,
      currentView: '月',
      fallbackDate: dayjs('2026-05-01'),
      payload: {
        preferredRecordTypeId: 'core.habit',
        title: '健康打卡',
        context: {
          目标: '生活/健康',
          goalPath: '生活/健康',
          __goalContext: { goalPath: '生活/健康' },
        },
        cellIdentifier: {
          type: 'day',
          category: '打卡',
          date: '2026-05-14',
        },
        blocks: [{ id: 'row-1' } as never],
      },
    });

    expect(opened).toBe(true);
    expect(QuickInputModal).toHaveBeenCalledWith(
      { name: 'app' },
      'core.habit',
      expect.objectContaining({
        目标: '生活/健康',
        goalPath: '生活/健康',
        __recordUiContext: expect.objectContaining({
          kind: 'statistics_create',
          timeContext: expect.objectContaining({
            periodType: '天',
            anchorDate: '2026-05-14',
            date: '2026-05-14',
          }),
          categoryContext: { category: '打卡' },
          goalContext: { goalPath: '生活/健康' },
          filterContext: expect.objectContaining({
            title: '健康打卡',
            blocksCount: 1,
            filters: [{ field: 'status', op: '=', value: 'open' }],
          }),
        }),
      }),
      undefined,
      true,
      expect.objectContaining({ mode: 'create', source: 'view_quick_create' }),
    );
  });

  it('preserves view-header context returned by the ActionService', () => {
    const config = {
      recordTypeId: 'core.plan',
      context: { 日期: '2026-05-14', 周期: '周', goalPath: '工作/项目' },
    };
    const opened = openCreateFromViewHeader({
      app: { name: 'app' },
      actionService: { getQuickInputConfigForView: jest.fn(() => config) } as never,
      viewInstance: { viewType: 'TimelineView' } as never,
      dateContext: dayjs('2026-05-14'),
      periodContext: '周',
    });

    expect(opened).toBe(true);
    expect(QuickInputModal).toHaveBeenCalledWith(
      { name: 'app' },
      'core.plan',
      config.context,
      undefined,
      true,
      expect.objectContaining({ mode: 'create', source: 'view_quick_create' }),
    );
  });

  it('shows a notice instead of opening heatmap create when no template can be resolved', () => {
    const notice = jest.fn();

    const opened = openCreateFromHeatmap({
      app: {},
      date: '2026-05-13',
      notice,
    });

    expect(opened).toBe(false);
    expect(QuickInputModal).not.toHaveBeenCalled();
    expect(notice).toHaveBeenCalledWith(expect.stringContaining('当前热力图没有可用于新增的记录类型'));
  });

  it('opens edit mode with item context', () => {
    const item = {
      id: 'item-1',
      recordType: 'task',
      path: 'Daily/2026-05-13.md',
      line: 8,
    } as never;

    const opened = openEditFromItem({ app: {}, item, openedFrom: 'timer' });

    expect(opened).toBe(true);
    expect(QuickInputModal).toHaveBeenCalledWith(
      {},
      'core.task',
      expect.objectContaining({
        __recordUiContext: expect.objectContaining({
          kind: 'entry_edit',
          entry: expect.objectContaining({
            entryId: 'item-1',
            openedFrom: 'timer',
            entryKind: 'task',
          }),
        }),
      }),
      undefined,
      false,
      expect.objectContaining({ mode: 'edit', editItem: expect.objectContaining({ id: 'item-1', recordType: 'task' }) }),
    );
  });

  it('internal Task Session / Series 编辑入口统一解析回 Task', () => {
    const task = { id: 'task-1', recordType: 'task', title: '写 ThinkOS', content: '写 ThinkOS', extra: {} } as never;
    const resolveRecordById = jest.fn((id: string) => id === 'task-1' ? task : null);

    expect(openEditFromItem({
      app: {},
      item: { id: 'session-1', recordType: 'task-session', taskId: 'task-1', extra: {} } as never,
      resolveRecordById,
    })).toBe(true);
    expect(QuickInputModal).toHaveBeenLastCalledWith(
      {}, 'core.task', expect.objectContaining({}), undefined, false,
      expect.objectContaining({ mode: 'edit', editItem: expect.objectContaining({ id: 'task-1', recordType: 'task' }) }),
    );

    expect(openEditFromItem({
      app: {},
      item: { id: 'series-1', recordType: 'task-series', currentTaskId: 'task-1', extra: {} } as never,
      resolveRecordById,
    })).toBe(true);
    expect(QuickInputModal).toHaveBeenLastCalledWith(
      {}, 'core.task', expect.objectContaining({}), undefined, false,
      expect.objectContaining({ mode: 'edit', editItem: expect.objectContaining({ id: 'task-1', recordType: 'task' }) }),
    );
  });

  it('所有 View 完成入口都通过 task runtime 解析 Timer context，并报告失败反馈', async () => {
    const notice = jest.fn();
    const completeTask = jest.fn().mockResolvedValue({
      status: 'error',
      errors: [{ message: '写回失败' }],
    });

    const result = await completeFromView({
      uiPort: { notice } as never,
      useCases: { taskRuntime: { completeTask } } as never,
      itemId: 'task-1',
    });

    expect(result).toBe(false);
    expect(completeTask).toHaveBeenCalledWith({
      taskId: 'task-1',
      source: 'layout_renderer',
    });
    expect(notice).toHaveBeenCalledWith('写回失败');
  });

  it('submits one semantic Timeline range change through the record input usecase', async () => {
    const notice = jest.fn();
    const submitUpdateTimelineRange = jest.fn().mockResolvedValue({
      status: 'success',
      feedback: { notice: '已更新时间' },
    });
    const target = { kind: 'task-plan' as const, recordId: 'task-1' };
    const range = { start: '2026-08-26T09:00', end: '2026-08-26T10:00' };

    const result = await updateTimelineRangeFromView({
      uiPort: { notice } as never,
      useCases: { recordInput: { submitUpdateTimelineRange } } as never,
      target,
      range,
      showSuccessNotice: true,
    });

    expect(result).toBe(true);
    expect(submitUpdateTimelineRange).toHaveBeenCalledWith({
      target,
      range,
      source: 'layout_renderer',
    });
    expect(notice).toHaveBeenCalledWith('已更新时间');
  });

  it('合并 View 投影和 canonical Record 后，Table 等视图打开历史 Task 不会丢失可编辑正文', () => {
    const canonical = {
      id: 'task.table-1',
      recordType: 'task',
      status: 'done',
      title: '',
      content: '',
      editableText: '',
      extra: {},
    } as never;
    const rendered = {
      id: 'task.table-1',
      recordType: 'task',
      status: 'done',
      title: '八段锦',
      content: '八段锦',
      goalPath: '照顾好自己/运动',
      extra: { 内容: '八段锦' },
    } as never;

    const merged = mergeRecordItemForEdit(canonical, rendered);

    expect(merged.content).toBe('八段锦');
    expect(merged.editableText).toBe('八段锦');
    expect(merged.goalPath).toBe('照顾好自己/运动');
  });

  it('编辑边界会用可见标题补齐缺失正文，避免 QuickInput 打开空白 Task', () => {
    const item = {
      id: 'task.table-2',
      recordType: 'task',
      status: 'done',
      title: '整理收藏夹',
      content: '',
      editableText: '',
      extra: {},
    } as never;

    openEditFromItem({ app: {}, item });

    expect(QuickInputModal).toHaveBeenLastCalledWith(
      {},
      'core.task',
      expect.objectContaining({}),
      undefined,
      false,
      expect.objectContaining({
        mode: 'edit',
        editItem: expect.objectContaining({ content: '整理收藏夹', editableText: '整理收藏夹' }),
      }),
    );
  });

});
