/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F093/unit
 * @covers F093/regression
 */
import {
  deriveEisenhowerQuadrant,
  taskClassificationForQuadrant,
  type RecordViewItem,
} from '@core/records/public';
import { TaskQuadrantMutation } from '@/core/services/item/TaskQuadrantMutation';
import type { RecordRepository } from '@/core/records/RecordRepository';
import { fromCachedItem, toCachedItem } from '@/core/types/cache';

function taskFixture(overrides: Partial<RecordViewItem> = {}): RecordViewItem {
  return {
    id: 'task-1',
    coreBlock: 'task',
    status: 'open',
    title: 'A',
    content: 'A',
    tags: [],
    categoryKey: '任务',
    created: 0,
    modified: 0,
    extra: {},
    source: { path: 'Tasks.md', startLine: 1, endLine: 2, modified: 1 },
    ...overrides,
  };
}

describe('Task 四象限领域规则 V3', () => {
  it('只有两个分类字段都明确时才进入四象限，否则保持未分类', () => {
    expect(deriveEisenhowerQuadrant({ coreBlock: 'task' })).toBe('unclassified');
    expect(deriveEisenhowerQuadrant({ coreBlock: 'task', importance: 'important' })).toBe('unclassified');
    expect(deriveEisenhowerQuadrant({ coreBlock: 'task', urgency: 'urgent' })).toBe('unclassified');
  });

  it('四种组合只由 importance 和 urgency 派生，不持久化 quadrant', () => {
    expect(deriveEisenhowerQuadrant({ coreBlock: 'task', importance: 'important', urgency: 'urgent' })).toBe('q1');
    expect(deriveEisenhowerQuadrant({ coreBlock: 'task', importance: 'important', urgency: 'normal' })).toBe('q2');
    expect(deriveEisenhowerQuadrant({ coreBlock: 'task', importance: 'normal', urgency: 'urgent' })).toBe('q3');
    expect(deriveEisenhowerQuadrant({ coreBlock: 'task', importance: 'normal', urgency: 'normal' })).toBe('q4');
  });

  it('拖回未分类会清空两个领域字段，而不是保存第五种 quadrant 状态', () => {
    expect(taskClassificationForQuadrant('q1')).toEqual({ importance: 'important', urgency: 'urgent' });
    expect(taskClassificationForQuadrant('unclassified')).toEqual({ importance: null, urgency: null });
  });
});

describe('Task 四象限写入边界 V3', () => {
  it('拖入象限只更新 importance / urgency，不保存 quadrant', async () => {
    const updates: Array<{ id: string; patch: Record<string, unknown> }> = [];
    const repository = {
      getById: async () => taskFixture(),
      update: async (id: string, patch: Record<string, unknown>) => { updates.push({ id, patch }); },
    } as unknown as RecordRepository;

    await new TaskQuadrantMutation(repository).move('task-1', 'q1');
    expect(updates).toEqual([{ id: 'task-1', patch: { importance: 'important', urgency: 'urgent' } }]);
    expect(updates[0].patch).not.toHaveProperty('quadrant');
  });

  it('缓存往返保留分类事实，未分类不会被默认成第四象限', () => {
    const classified = taskFixture({ importance: 'important', urgency: 'normal' });
    expect(fromCachedItem(toCachedItem(classified))).toMatchObject({ importance: 'important', urgency: 'normal' });

    const unclassified = taskFixture();
    expect(fromCachedItem(toCachedItem(unclassified))).toMatchObject({ importance: undefined, urgency: undefined });
  });
});
