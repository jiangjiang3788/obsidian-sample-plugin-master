/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F091/error
 * @covers F091/unit
 */
import { exportItemsToMarkdown, getExportConfigByViewType } from '@/core/utils/exportUtils';
import type { RecordViewItem } from '@/core/records/RecordEntity';

function item(overrides: Partial<RecordViewItem> = {}): RecordViewItem {
  return {
    id: 'rec.export.1',
    recordType: 'thought',
    title: '导出标题',
    content: '第一行\n第二行',
    filename: 'Daily',
    tags: [],
    created: 1,
    modified: 1,
    extra: {},
    ...overrides,
  } as RecordViewItem;
}

describe('Markdown 导出', () => {
  it('按配置进行多级分组，并安全展开多行内容', () => {
    const markdown = exportItemsToMarkdown([item()], getExportConfigByViewType('BlockView'));
    expect(markdown).toContain('## Daily');
    expect(markdown).toContain('### 思考');
    expect(markdown).toContain('第一行');
    expect(markdown).toContain('第二行');
    expect(markdown).toContain('rec.export.1');
  });

  it('Task 使用任务领域字段导出，缺省字段不会输出 undefined/null', () => {
    const markdown = exportItemsToMarkdown([item({
      id: 'task.export.1',
      recordType: 'task',
      content: '导出任务',
      status: 'open',
      goalPath: '学习/英语',
      priority: 'high',
    } as any)]);
    expect(markdown).toContain('**任务** 导出任务');
    expect(markdown).toContain('状态: open');
    expect(markdown).toContain('目标: 学习/英语');
    expect(markdown).not.toContain('undefined');
    expect(markdown).not.toContain('null');
  });

  it('未知 ViewType 回退到默认导出配置，而不是抛异常', () => {
    expect(() => exportItemsToMarkdown([item()], getExportConfigByViewType('UnknownView'))).not.toThrow();
  });
});
