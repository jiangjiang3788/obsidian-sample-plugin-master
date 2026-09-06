/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F045/unit
 * @covers F056/regression
 * @covers F089/unit
 */
import { buildViewProps } from '@/app/dashboard/viewPropsFactory';
import { VIEW_RUNTIME_BINDINGS } from '@/features/views/registry';
import type { ViewInstance } from '@core/types/public';

function makeView(viewType: keyof typeof VIEW_RUNTIME_BINDINGS): ViewInstance {
  return {
    id: `view:${viewType}`,
    title: viewType,
    viewType,
    filters: [],
    fields: [],
  } as unknown as ViewInstance;
}

describe('所有注册 View 的 Task runtime 动作接线', () => {
  it.each(Object.keys(VIEW_RUNTIME_BINDINGS) as Array<keyof typeof VIEW_RUNTIME_BINDINGS>)(
    '%s 共享唯一 onMarkDone 和 Timer controller，不自行构造任务运行时上下文',
    (viewType) => {
      const onMarkDone = jest.fn();
      const timerService = { startOrResume: jest.fn(async () => undefined) };
      const timers = [{ id: 'timer.contract', taskId: 'task.contract', status: 'running' }];
      const handlers = {
        onUpdateTaskTime: jest.fn(),
        onEditTimelineBlock: jest.fn(),
        onTaskQuadrantChange: jest.fn(),
        onQuickCreate: jest.fn(),
        onCategoryColorsChange: jest.fn(),
        onOpenRecord: jest.fn(),
        onOpenRecordOrigin: jest.fn(),
        resolveResourcePath: jest.fn(),
        onCreateFromTimeline: jest.fn(),
        onOpenHeatmapCreate: jest.fn(),
        onOpenCheckinManager: jest.fn(),
        onExcelCellCommit: jest.fn(),
        onExcelFieldsChange: jest.fn(),
        onExcelConfigChange: jest.fn(),
        onEnergyContextChange: jest.fn(),
        onNotice: jest.fn(),
      };

      const props = buildViewProps({
        viewInstance: makeView(viewType),
        viewItems: [],
        dateRange: [new Date('2026-08-26T00:00:00'), new Date('2026-08-27T00:00:00')],
        layoutView: '日',
        useFieldGranularity: false,
        excelAvailableFields: [],
        onMarkDone,
        handlers: handlers as never,
        onOpenStatisticsPopover: jest.fn(),
        onCloseStatisticsPopover: jest.fn(),
        timerService: timerService as never,
        timers,
        inputSettings: {},
        selectedLayoutCategories: [],
        categoryColors: {},
        allItems: [],
        allRecords: [],
      });

      expect(props.onMarkDone).toBe(onMarkDone);
      expect(props.timerService).toBe(timerService);
      expect(props.timers).toBe(timers);
    },
  );
});
