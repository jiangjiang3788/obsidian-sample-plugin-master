import type { BlockTemplate, Item } from '../../src/core/types/schema';
import { buildParsedRecordSnapshot } from '../../src/core/types/recordSnapshot';
import { buildInitialEditFormData } from '../../src/core/recordInput/EditBackfillMapper';

const baseItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'task.01J00000000000000000000004',
  schemaVersion: 2,
  coreBlock: 'task',
  status: 'open',
  title: '默认标题',
  content: '默认标题',
  rawSource: '<!-- start -->\n记录ID:: task.01J00000000000000000000004\n记录版本:: 2\n核心Block:: task\n状态:: open\n内容:: 默认标题\n<!-- end -->',
  tags: [],
  created: 0,
  modified: 0,
  categoryKey: '任务',
  extra: {},
  ...overrides,
});

function template(fields: BlockTemplate['fields']): Pick<BlockTemplate, 'fields'> {
  return { fields };
}

describe('EditBackfillMapper', () => {
  it('主题字段只从显式 theme/themePath 回填，不从 header 回填', () => {
    const item = baseItem({ header: '健康/睡眠' });
    const snapshot = buildParsedRecordSnapshot(item);
    const data = buildInitialEditFormData({
      template: template([
        { id: 'f1', key: 'myTheme', label: '我的主题', type: 'path', semantic: 'themePath' },
      ]),
      item,
      snapshot,
    });

    expect(data.myTheme).toBeUndefined();
  });

  it('显式主题路径可回填到任意 key 的 themePath 语义字段', () => {
    const item = baseItem({ theme: '学习/英语/听力' });
    const snapshot = buildParsedRecordSnapshot(item);
    const data = buildInitialEditFormData({
      template: template([
        { id: 'f1', key: 'topic', label: '主题选择', type: 'path', semantic: 'themePath' },
      ]),
      item,
      snapshot,
    });

    expect(data.topic).toEqual({ value: '学习/英语/听力', label: '听力' });
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
});
