/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F091/error
 * @covers F091/unit
 */
import { exportItemsToMarkdown, exportViewToMarkdown, getExportConfigByViewType } from '@/core/utils/exportUtils';
import type { RecordViewItem } from '@/core/records/RecordEntity';

function item(overrides: Partial<RecordViewItem> = {}): RecordViewItem {
  return {
    id: 'rec.export.1',
    recordType: 'thought',
    title: '',
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
  it('BlockView 继承当前多级分组，使用主显示值并默认隐藏技术 ID', () => {
    const markdown = exportViewToMarkdown({
      items: [item({ goalPath: '武装大脑/了解自我' })],
      viewInstance: {
        title: '思考',
        viewType: 'BlockView',
        groupFields: ['recordType', 'goalPath'],
      },
    });
    expect(markdown).toContain('# 思考');
    expect(markdown).toContain('## 思考');
    expect(markdown).toContain('### 武装大脑/了解自我');
    expect(markdown).toContain('- 第一行 第二行');
    expect(markdown).not.toContain('rec.export.1');
  });

  it('Task 从 TaskSession 汇总实际时长，并与预计时长明确区分', () => {
    const task = item({
      id: 'task.export.1',
      recordType: 'task',
      content: '导出任务',
      status: 'done',
      goalPath: '学习/英语',
      expectedDurationMinutes: 30,
      completedAt: '2026-09-12T16:30:00',
    });
    const session1 = item({
      id: 'session.1',
      recordType: 'task-session',
      taskId: task.id,
      sessionStartedAt: '2026-09-12T15:00:00',
      sessionEndedAt: '2026-09-12T15:20:00',
      sessionDurationMinutes: 20,
      sessionResult: 'work-block-ended',
      sessionSource: 'timer',
    });
    const session2 = item({
      id: 'session.2',
      recordType: 'task-session',
      taskId: task.id,
      sessionStartedAt: '2026-09-12T16:00:00',
      sessionEndedAt: '2026-09-12T16:25:00',
      sessionDurationMinutes: 25,
      sessionResult: 'task-completed',
      sessionSource: 'timer',
    });

    const markdown = exportViewToMarkdown({
      items: [task],
      relatedRecords: [task, session1, session2],
      viewInstance: { title: '任务', viewType: 'BlockView' },
    });

    expect(markdown).toContain('- ✅ 导出任务');
    expect(markdown).toContain('实际时长：45 分钟（2 次执行）');
    expect(markdown).toContain('预计时长：30 分钟');
    expect(markdown).toContain('完成：2026-09-12 16:30');
    expect(markdown).not.toContain('记录ID');
    expect(markdown).not.toContain('系列ID');
    expect(markdown).not.toContain('task.export.1');
  });

  it('Task 没有 Session 时可读旧 startAt/endAt；没有执行证据时不伪造 0 分钟', () => {
    const legacy = item({
      id: 'task.legacy',
      recordType: 'task',
      content: '旧任务',
      status: 'done',
      startAt: '2026-09-12T10:00:00',
      endAt: '2026-09-12T10:40:00',
    });
    const unknown = item({
      id: 'task.unknown',
      recordType: 'task',
      content: '未知时长任务',
      status: 'open',
    });

    const legacyMarkdown = exportViewToMarkdown({ items: [legacy], relatedRecords: [legacy] });
    const unknownMarkdown = exportViewToMarkdown({ items: [unknown], relatedRecords: [unknown] });
    expect(legacyMarkdown).toContain('实际时长：40 分钟');
    expect(unknownMarkdown).not.toContain('实际时长：0');
    expect(unknownMarkdown).not.toContain('实际时长');
  });

  it('Timeline 只汇总当前范围内的 Session，并展开执行明细', () => {
    const task = item({ id: 'task.timeline', recordType: 'task', content: '时间轴任务', status: 'done' });
    const inRangeSession = item({
      id: 'session.in', recordType: 'task-session', taskId: task.id,
      sessionStartedAt: '2026-09-12T09:00:00', sessionEndedAt: '2026-09-12T09:25:00',
      sessionDurationMinutes: 25, sessionResult: 'task-completed', sessionSource: 'timeline',
    });
    const outOfRangeSession = item({
      id: 'session.out', recordType: 'task-session', taskId: task.id,
      sessionStartedAt: '2026-09-10T09:00:00', sessionEndedAt: '2026-09-10T09:30:00',
      sessionDurationMinutes: 30, sessionResult: 'work-block-ended', sessionSource: 'timeline',
    });
    const markdown = exportViewToMarkdown({
      items: [task],
      relatedRecords: [task, inRangeSession, outOfRangeSession],
      dateRange: [new Date('2026-09-12T00:00:00'), new Date('2026-09-12T23:59:59')],
      viewInstance: { title: '时间轴', viewType: 'TimelineView' },
    });
    expect(markdown).toContain('本期实际时长：25 分钟');
    expect(markdown).toContain('09:00–09:25 · 25 分钟');
    expect(markdown).not.toContain('30 分钟');
  });

  it('未知 ViewType 回退到默认记录导出策略，而不是抛异常', () => {
    expect(() => exportItemsToMarkdown([item()], getExportConfigByViewType('UnknownView'))).not.toThrow();
  });
});
