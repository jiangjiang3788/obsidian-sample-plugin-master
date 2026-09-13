/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F076/unit
 */
import type { RetrievalIndexResult } from '../../src/core/ai/retrieval/RetrievalTypes';
import type { RecordViewItem } from '../../src/core/records/RecordEntity';
import { applyRetrievalFilters } from '../../src/core/ai/retrieval/RetrievalFilters';
import { collectSearchableExtraText, normalizeRetrievalText, tokenizeRetrievalText } from '../../src/core/ai/retrieval/RetrievalText';

const searchResult = (id: string, fields: Record<string, unknown> = {}): RetrievalIndexResult => ({
  id,
  score: 1,
  terms: ['任务'],
  queryTerms: ['任务'],
  match: {},
  ...fields,
} as unknown as RetrievalIndexResult);

const item = (overrides: Partial<RecordViewItem> = {}): RecordViewItem => ({
  id: 'item-1',
  title: '记录',
  content: '记录',
  tags: [],
  created: 0,
  modified: 0,
  recordType: 'task',
  extra: {},
  ...overrides,
} as RecordViewItem);

describe('retrieval model helpers', () => {
  it('normalizes nested text and tokenizes Chinese query text', () => {
    expect(normalizeRetrievalText({ values: ['英语', { src: '听力' }] })).toBe('英语 听力');
    expect(tokenizeRetrievalText('英语听力')).toEqual(expect.arrayContaining(['英', '英语', '听', '听力']));
  });

  it('indexes extra KV values while excluding reserved body aliases', () => {
    const extraText = collectSearchableExtraText(item({ extra: { 地点: '办公室', 正文: '隐藏正文' } }));
    expect(extraText).toContain('地点 办公室');
    expect(extraText).not.toContain('隐藏正文');
  });

  it('applies Goal and RecordType filters through the shared helper', () => {
    const indexed = new Map<string, RecordViewItem>([
      ['a', item({ id: 'a', goalPath: '武装大脑/学习/英语', recordType: 'task' })],
      ['b', item({ id: 'b', goalPath: '照顾好自己/健康/运动', recordType: 'habit' })],
    ]);
    const results = [searchResult('a'), searchResult('b')];

    expect(applyRetrievalFilters(results, { goalPaths: ['武装大脑/学习'], recordTypes: ['task'] }, indexed).map((result) => result.id)).toEqual(['a']);
  });
});
