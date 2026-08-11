import { parseRecordBlock } from '@/core/utils/parser';
import { encodeRecordBlock } from '@/core/records/codec';
import { getAllFields, readField, type Item } from '@/core/types/schema';
import { filterByKeyword, filterByRules } from '@/core/utils/itemFilter';
import { normalizeRecordItem } from '@/core/records/RecordNormalizer';
import { getAvailableFieldsByCategory, getFieldLabel } from '@/core/types/fields';

const TASK_ID = 'task.01J00000000000000000000000';
const REC_ID = 'rec.01J00000000000000000000000';

function parseRecord(coreBlock: string, fields: Record<string, unknown>, id = REC_ID): Item {
  const markdown = encodeRecordBlock({ recordId: id, coreBlock, fields });
  const lines = markdown.split('\n');
  const item = parseRecordBlock('records.md', lines, 0, lines.length - 1, 'root');
  if (!item) throw new Error('fixture failed to parse');
  return item;
}

function normalize(item: Item): Item {
  return normalizeRecordItem(item, {
    created: 1,
    modified: 2,
    filePath: 'records.md',
    fileName: 'records.md',
    parentFolder: 'root',
    line: 1,
  } as any);
}

describe('field semantics on Record Foundation v2', () => {
  it('Task content is clean while fullData remains the Record Block source', () => {
    const item = normalize(parseRecord('task', { 状态: 'open', 内容: '写代码', 地点: '办公室' }, TASK_ID));
    expect(item.content).toBe('写代码');
    expect(readField(item, '内容')).toBe('写代码');
    expect(String(readField(item, '完整数据'))).toContain(`记录ID:: ${TASK_ID}`);
    expect(item.extra['地点']).toBe('办公室');
  });

  it('filters can target complete raw Record data without changing clean content semantics', () => {
    const item = normalize(parseRecord('task', { 状态: 'open', 内容: '写代码', 自定义: '09:00' }, TASK_ID));
    expect(filterByRules([item], [{ field: 'content', op: 'includes', value: '09:00' }])).toHaveLength(0);
    expect(filterByRules([item], [{ field: '完整数据', op: 'includes', value: '09:00' }])).toHaveLength(1);
    expect(filterByKeyword([item], '09:00')).toHaveLength(1);
  });

  it('common field picker exposes themePath instead of legacy theme', () => {
    const fields = getAllFields([]);
    expect(fields).toContain('themePath');
    expect(fields).not.toContain('theme');
    expect(getFieldLabel('themePath')).toBe('主题路径');
    expect(getFieldLabel('theme')).toBe('主题路径');
  });

  it('field registry groups unknown Record KV as custom fields', () => {
    const item = normalize(parseRecord('thought', { 内容: '记录', 地点: '家' }));
    const grouped = getAvailableFieldsByCategory([item]);
    expect(grouped.core.map(f => f.key)).toContain('title');
    expect(grouped.file.map(f => f.key)).toContain('file.path');
    expect(grouped.custom.map(f => f.key)).toContain('extra.地点');
  });
});
