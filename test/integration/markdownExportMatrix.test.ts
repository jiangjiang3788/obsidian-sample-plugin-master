/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F091/error
 * @covers F091/integration
 */
import { exportItemsToMarkdown, getExportConfigByViewType } from '@/core/utils/exportUtils';
import type { RecordViewItem } from '@/core/records/RecordEntity';

function item(id: string, block: string, extra: Partial<RecordViewItem> = {}): RecordViewItem {
  return {
    id,
    recordType: block,
    title: `标题-${id}`,
    content: `内容-${id}`,
    filename: '2026-08-24',
    tags: [],
    created: 1,
    modified: 1,
    extra: {},
    ...extra,
  } as RecordViewItem;
}

describe('P1 Markdown 导出配置矩阵', () => {
  it.each(['BlockView', 'TableView', 'ExcelView', 'TimelineView', 'EventTimelineView', 'StatisticsView', 'HeatmapView'])(
    '%s 的导出配置都能接受混合 Record 并生成稳定 Markdown',
    (viewType) => {
      const markdown = exportItemsToMarkdown([
        item('rec.export.1', 'thought', { date: '2026-08-24' } as any),
        item('task.export.2', 'task', { status: 'done', goalPath: 'E2E', date: '2026-08-24' } as any),
      ], getExportConfigByViewType(viewType));
      expect(markdown).toContain('rec.export.1');
      expect(markdown).toContain('任务');
      expect(markdown).not.toMatch(/\bundefined\b|\bnull\b/);
    },
  );

  it('数组分组字段会把同一 Record 放进每个合法分组，空数组进入“未分类”', () => {
    const config = {
      ...getExportConfigByViewType('BlockView'),
      groupFields: ['tags'],
      detailFields: ['content'],
    };
    const markdown = exportItemsToMarkdown([
      item('rec.export.tags', 'thought', { tags: ['工作', '复盘'] }),
      item('rec.export.empty', 'thought', { tags: [] }),
    ], config);
    expect(markdown).toContain('## 工作');
    expect(markdown).toContain('## 复盘');
    expect(markdown).toContain('## 未分类');
  });
});
