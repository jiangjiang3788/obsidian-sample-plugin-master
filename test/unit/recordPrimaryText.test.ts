/**
 * @covers F153/unit
 * @covers F153/regression
 */
import type { RecordViewItem } from '@core/types/public';
import { getRecordPrimaryText, readFieldValue } from '@core/fields/public';

function record(coreBlock: string, overrides: Partial<RecordViewItem> = {}): RecordViewItem {
  return {
    id: `rec.${coreBlock}`, coreBlock, title: '', content: '', tags: [], categoryKey: coreBlock,
    created: 0, modified: 0, extra: {}, ...overrides,
  } as RecordViewItem;
}

describe('Record primaryText derived display field', () => {
  it('never mutates or semantically replaces the real title field', () => {
    const item = record('energy', { extra: { 精力值: 65 } });
    expect(readFieldValue(item, 'title')).toBe('');
    expect(readFieldValue(item, 'primaryText')).toBe('精力 65');
    expect(item.title).toBe('');
  });

  it('uses explicit titles first, independent of Record kind', () => {
    expect(getRecordPrimaryText(record('energy', { title: '下午状态', extra: { 精力值: 65 } }))).toBe('下午状态');
  });

  it('derives natural identity values for Energy, Habit and Task Session', () => {
    expect(getRecordPrimaryText(record('energy', { extra: { 精力值: 72 } }))).toBe('精力 72');
    expect(getRecordPrimaryText(record('habit', { rating: 4 }))).toBe('打卡 · 评分 4');
    expect(getRecordPrimaryText(record('task-session', { sessionDurationMinutes: 120 }))).toBe('任务工作块 · 120 分钟');
  });

  it('uses content for text records and the schema label only as the last fallback', () => {
    expect(getRecordPrimaryText(record('thought', { content: '我发现真正的问题是阅读成本。' }))).toBe('我发现真正的问题是阅读成本。');
    expect(getRecordPrimaryText(record('plan'))).toBe('计划');
  });

  it('11 种 Record 都有明确的无标题展示策略，不依赖视图自己猜测', () => {
    const expected: Record<string, string> = {
      task: '任务', 'task-session': '任务工作块', 'task-series': '任务系列', energy: '精力', habit: '打卡',
      evidence: '事件', thought: '思考', review: '总结', plan: '计划', blocker: '阻碍项', milestone: '里程碑',
    };
    for (const [coreBlock, label] of Object.entries(expected)) {
      expect(getRecordPrimaryText(record(coreBlock))).toBe(label);
    }
  });
});
