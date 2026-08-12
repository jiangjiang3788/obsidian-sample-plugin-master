import type { RecordViewItem } from '../../src/core/records/RecordEntity';
import { RetrievalService } from '../../src/core/ai/RetrievalService';

const baseItem = (overrides: Partial<RecordViewItem> = {}): RecordViewItem => ({
  id: 'item-1',
  title: '记录',
  content: '记录',
  tags: [],
  created: 0,
  modified: 0,
  coreBlock: 'task',
  status: 'open',
  categoryKey: '任务',
  extra: {},
  ...overrides,
});

describe('RetrievalService field semantics', () => {
  it('themePaths 过滤只使用 themePath，不使用 header 或 legacy theme', () => {
    const items = [
      baseItem({
        id: 'header-only',
        title: '无主题任务',
        content: '无主题任务',
        header: '健康/睡眠',
      }),
      baseItem({
        id: 'explicit-theme',
        title: '显式主题任务',
        content: '显式主题任务',
        theme: '健康/睡眠',
        themePath: '健康/睡眠',
        rootTheme: '健康',
        leafTheme: '睡眠',
      }),
    ];
    const service = new RetrievalService({ queryItems: () => items } as any);
    service.buildIndex(items);

    const result = service.search('任务', { themePaths: ['健康'] });

    expect(result.items.map(item => item.id)).toEqual(['explicit-theme']);
  });

  it('extra 搜索索引保留显式未知 KV，但排除历史正文 alias 污染', () => {
    const items = [
      baseItem({
        id: 'extra-item',
        title: '普通记录',
        content: '普通记录',
        extra: {
          地点: '办公室',
          正文: '隐藏污染值',
        },
      }),
    ];
    const service = new RetrievalService({ queryItems: () => items } as any);
    service.buildIndex(items);

    expect(service.search('办公室').items.map(item => item.id)).toEqual(['extra-item']);
    expect(service.search('隐藏污染值').items).toHaveLength(0);
  });
});
