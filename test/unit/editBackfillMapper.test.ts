/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F015/regression
 * @covers F015/unit
 * @covers F045/unit
 */
import type { RecordCaptureTemplate } from '../../src/core/recordInput/CaptureTemplate';
import type { RecordViewItem } from '../../src/core/records/RecordEntity';
import { buildParsedRecordSnapshot } from '../../src/core/types/recordSnapshot';
import { buildInitialEditFormData } from '../../src/core/recordInput/EditBackfillMapper';

const baseItem = (overrides: Partial<RecordViewItem> = {}): RecordViewItem => ({
  id: 'task.01J00000000000000000000004',
  recordType: 'task',
  status: 'open',
  title: '默认标题',
  content: '默认标题',
  rawSource: '<!-- start -->\n记录ID:: task.01J00000000000000000000004\n记录类型:: task\n状态:: open\n内容:: 默认标题\n<!-- end -->',
  tags: [],
  created: 0,
  modified: 0,
  extra: {},
  ...overrides,
});

function template(fields: RecordCaptureTemplate['fields']): Pick<RecordCaptureTemplate, 'fields'> {
  return { fields };
}

describe('EditBackfillMapper', () => {
  it('Goal fields backfill from canonical goalPath without any Category projection', () => {
    const item = baseItem({ goalPath: '了解自我/记录感受' });
    const snapshot = buildParsedRecordSnapshot(item);
    const data = buildInitialEditFormData({
      template: template([{ id: 'f1', key: '目标', label: '目标', type: 'hierarchicalSingleSelect', semantic: 'goalPath' }]),
      item,
      snapshot,
    });
    expect(data['目标']).toEqual({ value: '了解自我/记录感受', label: '记录感受' });
  });

  it('任务正文回填使用 canonical content 并保留正文内部空格', () => {
    const item = baseItem({
      title: '长治学院',
      content: '长治学院  设计道旗定稿',
      editableText: '长治学院  设计道旗定稿',
    });
    const snapshot = buildParsedRecordSnapshot(item);
    const data = buildInitialEditFormData({
      template: template([
        { id: 'f1', key: 'bodyText', label: '正文', type: 'textarea', semantic: 'body' },
      ]),
      item,
      snapshot,
    });

    expect(data.bodyText).toBe('长治学院  设计道旗定稿');
  });

  it('显式未知 KV 仍可回填到自定义 extra 字段', () => {
    const item = baseItem({ extra: { 项目: '插件重构' } });
    const snapshot = buildParsedRecordSnapshot(item);
    const data = buildInitialEditFormData({
      template: template([
        { id: 'f1', key: 'project', label: '项目', type: 'text' },
      ]),
      item,
      snapshot,
    });

    expect(data.project).toBe('插件重构');
  });

  it('标签语义字段按 multiTag 回填为数组', () => {
    const item = baseItem({ tags: ['项目/插件', '地点/家'] });
    const snapshot = buildParsedRecordSnapshot(item);
    const data = buildInitialEditFormData({
      template: template([
        { id: 'f1', key: 'labels', label: '我的标签', type: 'multiTag', semantic: 'tags', cardinality: 'multi' },
      ]),
      item,
      snapshot,
    });

    expect(data.labels).toEqual(['项目/插件', '地点/家']);
  });

  it('Task edit backfills canonical start/end and expected duration instead of generic timeline duration', () => {
    const item = baseItem({
      startAt: '2026-08-26T09:20',
      endAt: '2026-08-26T10:05',
      expectedDurationMinutes: 45,
      duration: undefined,
    });
    const snapshot = buildParsedRecordSnapshot(item);
    const data = buildInitialEditFormData({
      template: template([
        { id: 'start', key: 'startAt', label: '开始/预计时间', type: 'datetime', semantic: 'startTime' },
        { id: 'end', key: 'endAt', label: '结束时间', type: 'datetime', semantic: 'endTime' },
        { id: 'duration', key: 'expectedDurationMinutes', label: '时长（分钟）', type: 'number', semantic: 'duration' },
      ]),
      item,
      snapshot,
    });

    expect(data).toMatchObject({
      startAt: '2026-08-26T09:20',
      endAt: '2026-08-26T10:05',
      expectedDurationMinutes: 45,
    });
  });


  it('derives edit duration from a legacy Task start/end range when expectedDurationMinutes is absent', () => {
    const item = baseItem({
      startAt: '2026-08-26T09:20',
      endAt: '2026-08-26T10:05',
      expectedDurationMinutes: undefined,
      duration: undefined,
    });
    const snapshot = buildParsedRecordSnapshot(item);
    const data = buildInitialEditFormData({
      template: template([
        { id: 'duration', key: 'expectedDurationMinutes', label: '时长（分钟）', type: 'number', semantic: 'duration' },
      ]),
      item,
      snapshot,
    });

    expect(data.expectedDurationMinutes).toBe(45);
  });


  it('普通计划编辑保留旧实际 range，但不会把 startAt 误复制成 scheduledAt', () => {
    const item = baseItem({
      startAt: '2026-08-26T09:20',
      endAt: '2026-08-26T10:05',
      completedAt: '2026-08-26T10:05',
      status: 'done',
    });
    const snapshot = buildParsedRecordSnapshot(item);
    const data = buildInitialEditFormData({
      template: template([
        { id: 'scheduled', key: 'scheduledAt', label: '计划时间', type: 'datetime', semantic: 'startTime' },
        { id: 'duration', key: 'expectedDurationMinutes', label: '预计时长（分钟）', type: 'number', semantic: 'duration' },
      ]),
      item,
      snapshot,
    });

    expect(data.scheduledAt).toBeUndefined();
    expect(data.startAt).toBe('2026-08-26T09:20');
    expect(data.endAt).toBe('2026-08-26T10:05');
    expect(data.completedAt).toBe('2026-08-26T10:05');
    expect(data.status).toBe('done');
  });

});
