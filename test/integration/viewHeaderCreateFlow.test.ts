/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F092/integration
 * @covers F092/regression
 */
const mockOpen = jest.fn();
const mockModal = jest.fn().mockImplementation(() => ({ open: mockOpen }));
jest.mock('@/app/ui/modals/QuickInputModal', () => ({ QuickInputModal: mockModal }));

import { openCreateFromViewHeader } from '@/app/actions/recordCreate/viewHeaderCreateAction';

describe('视图头部创建记录组合链路', () => {
  beforeEach(() => { mockOpen.mockClear(); mockModal.mockClear(); });

  it('支持头部创建的普通视图通过 ActionService 上下文打开 Quick Input', () => {
    const actionService = {
      getQuickInputConfigForView: jest.fn(() => ({ blockId: 'core.task', context: { 日期: '2026-08-24' } })),
    } as any;
    const result = openCreateFromViewHeader({
      app: {} as any,
      actionService,
      viewInstance: { id: 'timeline', title: '时间轴', viewType: 'TimelineView', viewConfig: {} } as any,
      dateContext: '2026-08-24' as any,
      periodContext: '周',
    });

    expect(result).toBe(true);
    expect(actionService.getQuickInputConfigForView).toHaveBeenCalled();
    expect(mockModal).toHaveBeenCalled();
    expect(mockOpen).toHaveBeenCalled();
  });

  it('不支持 headerCreate 的块视图不会误开录入窗口', () => {
    const actionService = { getQuickInputConfigForView: jest.fn() } as any;
    const result = openCreateFromViewHeader({
      app: {} as any,
      actionService,
      viewInstance: { id: 'block', title: '块视图', viewType: 'BlockView', viewConfig: {} } as any,
      dateContext: null as any,
      periodContext: '周',
    });
    expect(result).toBe(false);
    expect(actionService.getQuickInputConfigForView).not.toHaveBeenCalled();
    expect(mockOpen).not.toHaveBeenCalled();
  });
});
