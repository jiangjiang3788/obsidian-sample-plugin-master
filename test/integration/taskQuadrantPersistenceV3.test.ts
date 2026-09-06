/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F093/integration
 * @covers F093/persistence
 * @covers F093/regression
 */
import { encodeRecordBlock } from '@/core/records/codec';
import { parseRecordBlock } from '@/core/utils/parser';
import { buildExplicitTaskSeriesEditPlan } from '@/app/usecases/recordInput/workflows/UpdateRecordWorkflow';
import type { RecordViewItem } from '@core/types/public';

function parse(markdown: string) {
  const lines = markdown.split('\n');
  return parseRecordBlock('test/quadrant.md', lines, 0, lines.length - 1, 'test');
}

describe('Task 四象限字段持久化与周期边界 V3', () => {
  it('Markdown 只保存重要/紧急事实，重扫后仍可恢复，不保存 quadrant', () => {
    const markdown = encodeRecordBlock({
      recordId: 'task.01J00000000000000000000993',
      coreBlock: 'task',
      fields: { status: 'open', content: '四象限任务', importance: 'important', urgency: 'urgent' },
    });
    expect(markdown).toContain('重要程度:: important');
    expect(markdown).toContain('紧急程度:: urgent');
    expect(markdown).not.toMatch(/quadrant/i);
    expect(parse(markdown)).toMatchObject({ importance: 'important', urgency: 'urgent' });
  });

  it('周期任务只有显式选择本次及以后才把分类同步到 Series', () => {
    const item: RecordViewItem = {
      id: 'task-1', coreBlock: 'task', status: 'open', seriesId: 'series-1', title: '周期任务', content: '周期任务',
      tags: [], categoryKey: '任务', created: 0, modified: 0, extra: {},
    };
    expect(buildExplicitTaskSeriesEditPlan({ item, meta: {} }, { importance: 'important', urgency: 'urgent' })).toBeNull();
    const plan = buildExplicitTaskSeriesEditPlan({
      item, meta: { taskSeriesEdit: { scope: 'current_and_future' } },
    }, { importance: 'important', urgency: 'urgent' });
    expect(plan).toMatchObject({
      seriesId: 'series-1',
      update: { importance: 'important', urgency: 'urgent' },
    });
  });
});
