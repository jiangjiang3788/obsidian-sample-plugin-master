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
  updateTimeFromView,
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
      sourceBlockId: 'core.habit',
      date: '2026-05-14',
      goalPath: '生活/健康',
      item: {
        id: 'habit-1',
        coreBlock: 'habit',
        categoryKey: '打卡',
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
        preferredBlockId: 'core.habit',
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
      blockId: 'core.plan',
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
      categoryKey: 'Task',
      coreBlock: 'task',
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
      expect.objectContaining({ mode: 'edit', editItem: item }),
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

  it('submits time updates through the record input usecase', async () => {
    const notice = jest.fn();
    const submitUpdateRecordTime = jest.fn().mockResolvedValue({
      status: 'success',
      feedback: { notice: '已更新时间' },
    });

    const result = await updateTimeFromView({
      uiPort: { notice } as never,
      useCases: { recordInput: { submitUpdateRecordTime } } as never,
      itemId: 'task-1',
      showSuccessNotice: true,
      updates: { time: '09:00', endTime: '10:00', duration: 60 },
    });

    expect(result).toBe(true);
    expect(submitUpdateRecordTime).toHaveBeenCalledWith({
      itemId: 'task-1',
      updates: { time: '09:00', endTime: '10:00', duration: 60 },
      source: 'layout_renderer',
    });
    expect(notice).toHaveBeenCalledWith('已更新时间');
  });
});
