/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F076/integration
 * @covers F076/regression
 */
import { RetrievalService } from '@/core/ai/RetrievalService';
import type { RecordViewItem } from '@/core/records/RecordEntity';

function item(id: string, overrides: Partial<RecordViewItem>): RecordViewItem {
  return {
    id,
    title: id,
    content: '',
    tags: [],
    created: 0,
    modified: 0,
    recordType: 'thought',
    extra: {},
    ...overrides,
  } as RecordViewItem;
}

describe('AI 检索索引、过滤与结果映射组合链路', () => {
  it('从 DataStore 取数建索引后，同时执行全文、Goal 子树和记录类型过滤', () => {
    const rows = [
      item('task-child', { title: '测试体系任务', content: '继续完善', goalPath: '工作/Think OS/测试', recordType: 'task' }),
      item('thought-child', { title: '测试体系想法', content: '继续完善', goalPath: '工作/Think OS/测试', recordType: 'thought' }),
      item('task-other', { title: '测试体系任务', content: '继续完善', goalPath: '生活/健康', recordType: 'task' }),
    ];
    const dataStore = { queryItems: jest.fn(() => rows) };
    const service = new RetrievalService(dataStore as any);

    const result = service.search('测试体系', {
      goalPaths: ['工作/Think OS'],
      recordTypes: ['task'],
      limit: 20,
    });

    expect(dataStore.queryItems).toHaveBeenCalled();
    expect(result.totalMatched).toBe(1);
    expect(result.items.map((row) => row.id)).toEqual(['task-child']);
    expect(result.results[0]).toMatchObject({ item: expect.objectContaining({ id: 'task-child' }) });
  });

  it('header 中碰巧出现 Goal 文本不能绕过 canonical goalPath 过滤', () => {
    const rows = [
      item('header-only', { title: '目标测试', header: '工作/Think OS', goalPath: undefined }),
      item('canonical', { title: '目标测试', goalPath: '工作/Think OS' }),
    ];
    const service = new RetrievalService({ queryItems: () => rows } as any);
    const result = service.search('目标测试', { goalPaths: ['工作'] });
    expect(result.items.map((row) => row.id)).toEqual(['canonical']);
  });
});
