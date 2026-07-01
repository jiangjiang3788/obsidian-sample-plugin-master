import type { SearchResult } from 'minisearch';
import type { Item } from '../../src/core/types/schema';
import { applyRetrievalFilters } from '../../src/core/ai/retrieval/RetrievalFilters';
import { collectSearchableExtraText, normalizeRetrievalText, tokenizeRetrievalText } from '../../src/core/ai/retrieval/RetrievalText';

const searchResult = (id: string, fields: Record<string, unknown> = {}): SearchResult => ({
  id,
  score: 1,
  terms: ['任务'],
  queryTerms: ['任务'],
  match: {},
  ...fields,
} as unknown as SearchResult);

const item = (overrides: Partial<Item> = {}): Item => ({
  id: 'item-1',
  title: '记录',
  content: '记录',
  type: 'task',
  tags: [],
  recurrence: 'none',
  created: 0,
  modified: 0,
  categoryKey: '任务',
  extra: {},
  ...overrides,
} as Item);

describe('retrieval model helpers', () => {
  it('normalizes nested text and tokenizes Chinese query text', () => {
    expect(normalizeRetrievalText({ values: ['英语', { src: '听力' }] })).toBe('英语 听力');
    expect(tokenizeRetrievalText('英语听力')).toEqual(expect.arrayContaining(['英', '英语', '听', '听力']));
  });

  it('indexes extra KV values but excludes legacy content aliases', () => {
    const extraText = collectSearchableExtraText(item({ extra: { 地点: '办公室', 正文: '隐藏正文' } }));
    expect(extraText).toContain('地点 办公室');
    expect(extraText).not.toContain('隐藏正文');
  });

  it('applies theme/type/template/category filters through the shared helper', () => {
    const indexed = new Map<string, Item>([
      ['a', item({ id: 'a', type: 'task', themePath: '学习/英语', templateId: 'tpl-a', categoryKey: '打卡/听力' })],
      ['b', item({ id: 'b', type: 'block', themePath: '健康/运动', templateId: 'tpl-b', categoryKey: '总结' })],
    ]);
    const results = [searchResult('a'), searchResult('b')];

    expect(applyRetrievalFilters(results, { themePaths: ['学习'], types: ['task'], blockTemplateIds: ['tpl-a'], blockTemplateNames: ['打卡'] }, indexed).map((result) => result.id)).toEqual(['a']);
  });
});
