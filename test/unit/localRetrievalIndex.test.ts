/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F076/unit
 */
import { LocalRetrievalIndex } from '../../src/core/ai/retrieval/LocalRetrievalIndex';
import type { SearchIndexDocument } from '../../src/core/ai/retrieval/RetrievalTypes';

const document = (overrides: Partial<SearchIndexDocument>): SearchIndexDocument => ({
  id: 'doc',
  title: '',
  content: '',
  editableText: '',
  fullData: '',
  tags: '',
  goalPath: '',
  rootGoal: '',
  leafGoal: '',
  categoryKey: '',
  baseCategory: '',
  leafCategory: '',
  coreBlock: 'task',
  fileName: '',
  folder: '',
  header: '',
  extraText: '',
  ...overrides,
});

describe('LocalRetrievalIndex', () => {
  it('keeps title boost ahead of the same token in low-weight extra text', () => {
    const index = new LocalRetrievalIndex();
    index.addAll([
      document({ id: 'title-hit', title: '项目架构' }),
      document({ id: 'extra-hit', extraText: '项目架构' }),
    ]);

    expect(index.search('项目')[0]?.id).toBe('title-hit');
  });

  it('supports prefix search without an external search package', () => {
    const index = new LocalRetrievalIndex();
    index.addAll([document({ id: 'prefix-hit', title: 'architecture' })]);

    expect(index.search('arch')[0]?.id).toBe('prefix-hit');
  });

  it('supports light fuzzy matching for ordinary latin terms', () => {
    const index = new LocalRetrievalIndex();
    index.addAll([document({ id: 'fuzzy-hit', title: 'project' })]);

    expect(index.search('projet')[0]?.id).toBe('fuzzy-hit');
  });

  it('keeps the existing Chinese unigram and bigram tokenizer behavior', () => {
    const index = new LocalRetrievalIndex();
    index.addAll([document({ id: 'cn-hit', title: '英语听力训练' })]);

    expect(index.search('听力')[0]?.id).toBe('cn-hit');
  });
});
