/**
 * @covers F096/unit
 * @covers F096/regression
 */
import type { RecordViewItem } from '@core/types/public';
import type { WhiteboardItem } from '@core/whiteboard/public';
import { findWhiteboardItemIds, stepWhiteboardFindIndex } from '@/features/whiteboard/WhiteboardFindModel';

function record(id: string, overrides: Partial<RecordViewItem> = {}): RecordViewItem {
  return {
    id,
    coreBlock: 'thought',
    title: id,
    content: `${id} 内容`,
    tags: [],
    categoryKey: 'thought',
    goalPath: '照顾好自己/睡眠',
    date: '2026-09-08',
    created: 0,
    modified: 0,
    extra: {},
    ...overrides,
  } as RecordViewItem;
}

const items: WhiteboardItem[] = [
  { id: 'item-sleep', recordId: 'rec-sleep', x: 24, y: 24 },
  { id: 'item-phone', recordId: 'rec-phone', x: 320, y: 24 },
  { id: 'item-missing', recordId: 'rec-missing', x: 620, y: 24 },
];

describe('白板内定位纯模型 1.1.3', () => {
  test('只匹配当前白板 item，并可按标题、正文、目标、类型组合查找', () => {
    const records = new Map<string, RecordViewItem>([
      ['rec-sleep', record('rec-sleep', { title: '昨晚睡眠', content: '半夜醒来', goalPath: '照顾好自己/睡眠' })],
      ['rec-phone', record('rec-phone', { title: '手机刺激', content: '睡前刷手机', goalPath: '我若安好便是晴天/娱乐' })],
    ]);
    expect(findWhiteboardItemIds(items, records, '睡眠')).toEqual(['item-sleep']);
    expect(findWhiteboardItemIds(items, records, '手机 刺激')).toEqual(['item-phone']);
    expect(findWhiteboardItemIds(items, records, '思考 睡眠')).toEqual(['item-sleep']);
  });

  test('dangling Record 仍可通过 recordId 定位；空查询不产生高亮状态', () => {
    const records = new Map<string, RecordViewItem>();
    expect(findWhiteboardItemIds(items, records, 'rec-missing')).toEqual(['item-missing']);
    expect(findWhiteboardItemIds(items, records, '   ')).toEqual([]);
  });

  test('上一项/下一项循环，不改变 item 顺序或持久状态', () => {
    expect(stepWhiteboardFindIndex(0, 3, 1)).toBe(1);
    expect(stepWhiteboardFindIndex(2, 3, 1)).toBe(0);
    expect(stepWhiteboardFindIndex(0, 3, -1)).toBe(2);
    expect(stepWhiteboardFindIndex(4, 0, 1)).toBe(0);
  });
});
