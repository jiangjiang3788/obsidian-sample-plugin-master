const modalOpenMock = jest.fn();

jest.mock('@/app/public', () => ({
  QuickInputModal: jest.fn().mockImplementation(() => ({
    open: modalOpenMock,
  })),
}));

jest.mock('@core/public', () => {
  const dayjs = require('dayjs');
  const isoWeek = require('dayjs/plugin/isoWeek');
  const quarterOfYear = require('dayjs/plugin/quarterOfYear');
  dayjs.extend(isoWeek);
  dayjs.extend(quarterOfYear);

  return {
    dayjs,
    minutesToTime: (minutes: number) => {
      const h = Math.floor(minutes / 60).toString().padStart(2, '0');
      const m = Math.floor(minutes % 60).toString().padStart(2, '0');
      return `${h}:${m}`;
    },
    isRecordSubmitSuccess: (result: any, options?: { treatCancelledAsSuccess?: boolean }) => {
      return result?.status === 'success' || (options?.treatCancelledAsSuccess && result?.status === 'cancelled');
    },
    readRecordSubmitMessage: (result: any, fallback: string) => {
      return result?.feedback?.notice || result?.errors?.[0]?.message || fallback;
    },
  };
});

import {
  canCreateFromStatisticsCell,
  completeFromView,
  isModuleHeaderCreateAllowed,
  openCreateFromHeatmap,
  openCreateFromTimeline,
  openEditFromItem,
  updateTimeFromView,
} from '@/app/actions/recordUiActions';
import { QuickInputModal } from '@/app/public';

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
      uiPort: { notice: jest.fn() } as any,
      inputBlocks: [{ id: 'task-block', name: 'Task' }],
      hourHeight: 60,
      dayBlocks: [
        { blockEndMinute: 80 },
        { blockStartMinute: 120 },
      ] as any,
      day: '2026-05-13',
      event,
    });

    expect(opened).toBe(true);
    expect(QuickInputModal).toHaveBeenCalledWith(
      { name: 'app' },
      'task-block',
      expect.objectContaining({
        日期: '2026-05-13',
        时间: '01:20',
        结束: '02:00',
        __recordUiContext: expect.objectContaining({ kind: 'timeline_create' }),
      }),
      undefined,
      undefined,
      false,
      expect.objectContaining({ mode: 'create', source: 'view_quick_create' }),
    );
    expect(modalOpenMock).toHaveBeenCalledTimes(1);
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
    expect(notice).toHaveBeenCalledWith(expect.stringContaining('当前热力图没有可用于新增的模板'));
  });

  it('opens edit mode with item context', () => {
    const item = {
      id: 'item-1',
      templateId: 'task-block',
      categoryKey: 'Task',
      path: 'Daily/2026-05-13.md',
      line: 8,
    } as any;

    const opened = openEditFromItem({ app: {}, item, openedFrom: 'timer' });

    expect(opened).toBe(true);
    expect(QuickInputModal).toHaveBeenCalledWith(
      {},
      'task-block',
      expect.objectContaining({
        __recordUiContext: expect.objectContaining({
          kind: 'entry_edit',
          entry: expect.objectContaining({
            entryId: 'item-1',
            openedFrom: 'timer',
            supportsTaskTimeEditing: true,
          }),
        }),
      }),
      undefined,
      undefined,
      false,
      expect.objectContaining({ mode: 'edit', editItem: item }),
    );
  });

  it('submits complete updates through the record input usecase and reports failure feedback', async () => {
    const notice = jest.fn();
    const submitCompleteRecord = jest.fn().mockResolvedValue({
      status: 'error',
      errors: [{ message: '写回失败' }],
    });

    const result = await completeFromView({
      uiPort: { notice } as any,
      useCases: { recordInput: { submitCompleteRecord } } as any,
      itemId: 'task-1',
    });

    expect(result).toBe(false);
    expect(submitCompleteRecord).toHaveBeenCalledWith({
      itemId: 'task-1',
      options: undefined,
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
      uiPort: { notice } as any,
      useCases: { recordInput: { submitUpdateRecordTime } } as any,
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
