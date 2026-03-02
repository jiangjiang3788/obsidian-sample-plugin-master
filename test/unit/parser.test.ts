import { parseTaskLine, parseBlockContent } from '@/core/utils/parser';

describe('parseTaskLine', () => {
  const filePath = 'test/sample.md';
  const folder = 'test';

  it('parses a basic open task', () => {
    const line = '- [ ] 买菜 #生活 📅 2025-03-01';
    const item = parseTaskLine(filePath, line, 10, folder);

    expect(item).not.toBeNull();
    expect(item!.id).toBe('test/sample.md#10');
    expect(item!.type).toBe('task');
    expect(item!.categoryKey).toBe('未完成任务');
    expect(item!.tags).toContain('生活');
    expect(item!.dueDate).toBe('2025-03-01');
    expect(item!.folder).toBe('test');
  });

  it('parses a done task', () => {
    const line = '- [x] 完成报告 ✅ 2025-02-28';
    const item = parseTaskLine(filePath, line, 5, folder);

    expect(item).not.toBeNull();
    expect(item!.categoryKey).toBe('完成任务');
    expect(item!.doneDate).toBe('2025-02-28');
  });

  it('parses a cancelled task', () => {
    const line = '- [-] 取消的任务 ❌ 2025-02-20';
    const item = parseTaskLine(filePath, line, 3, folder);

    expect(item).not.toBeNull();
    expect(item!.categoryKey).toBe('完成任务');
    expect(item!.cancelledDate).toBe('2025-02-20');
  });

  it('returns null for non-task lines', () => {
    expect(parseTaskLine(filePath, '这不是任务', 1, folder)).toBeNull();
    expect(parseTaskLine(filePath, '# 标题', 2, folder)).toBeNull();
    expect(parseTaskLine(filePath, '', 3, folder)).toBeNull();
  });

  it('parses inline KV fields: theme, tags, time', () => {
    const line = '- [ ] 开会 (主题::工作) (标签::重要,紧急) (时间::09:00) (结束::10:30) (时长::90)';
    const item = parseTaskLine(filePath, line, 7, folder);

    expect(item).not.toBeNull();
    expect(item!.theme).toBe('工作');
    expect(item!.tags).toContain('重要');
    expect(item!.tags).toContain('紧急');
    expect(item!.startTime).toBe('09:00');
    expect(item!.endTime).toBe('10:30');
    expect(item!.duration).toBe(90);
  });

  it('theme field does NOT leak into tags', () => {
    const line = '- [ ] 测试 (主题::项目A) #标签1';
    const item = parseTaskLine(filePath, line, 1, folder);

    expect(item).not.toBeNull();
    expect(item!.theme).toBe('项目A');
    expect(item!.tags).toContain('标签1');
    expect(item!.tags).not.toContain('项目A');
  });

  it('parses priority emojis', () => {
    const highLine = '- [ ] 紧急任务 ⏫';
    const item = parseTaskLine(filePath, highLine, 1, folder);
    expect(item!.priority).toBe('high');

    const lowLine = '- [ ] 低优先级 🔽';
    const lowItem = parseTaskLine(filePath, lowLine, 2, folder);
    expect(lowItem!.priority).toBe('low');
  });

  it('parses multiple date types', () => {
    const line = '- [ ] 任务 ➕ 2025-01-01 🛫 2025-01-05 📅 2025-01-10 ⏳ 2025-01-08';
    const item = parseTaskLine(filePath, line, 1, folder);

    expect(item).not.toBeNull();
    expect(item!.createdDate).toBe('2025-01-01');
    expect(item!.startDate).toBe('2025-01-05');
    expect(item!.dueDate).toBe('2025-01-10');
    expect(item!.scheduledDate).toBe('2025-01-08');
  });

  it('parses recurrence', () => {
    const line = '- [ ] 每日回顾 🔁 every day 📅 2025-03-01';
    const item = parseTaskLine(filePath, line, 1, folder);

    expect(item).not.toBeNull();
    expect(item!.recurrence).toBe('every day');
  });

  it('deduplicates tags', () => {
    const line = '- [ ] 测试 #重复 #重复 (标签::重复)';
    const item = parseTaskLine(filePath, line, 1, folder);

    expect(item).not.toBeNull();
    const count = item!.tags.filter(t => t === '重复').length;
    expect(count).toBe(1);
  });

  it('parses extra KV fields into item.extra', () => {
    const line = '- [ ] 测试 (自定义字段::自定义值) (数字字段::42) (布尔字段::true)';
    const item = parseTaskLine(filePath, line, 1, folder);

    expect(item).not.toBeNull();
    expect(item!.extra['自定义字段']).toBe('自定义值');
    expect(item!.extra['数字字段']).toBe(42);
    expect(item!.extra['布尔字段']).toBe(true);
  });
});

describe('parseBlockContent', () => {
  const filePath = 'test/blocks.md';
  const folder = 'blocks';

  function makeLines(content: string): string[] {
    return content.split('\n');
  }

  it('parses a basic block with KV fields', () => {
    const lines = makeLines([
      '[!thinktxt]',           // line 0 (startIdx)
      '分类:: 读书',            // line 1
      '标签:: 小说,历史',        // line 2
      '日期:: 2025-03-01',      // line 3
      '周期:: 月',              // line 4
      '评分:: 8',               // line 5
      '内容:: 这是内容',         // line 6
      '第二行内容',              // line 7
    ].join('\n'));

    const item = parseBlockContent(filePath, lines, 0, lines.length, folder);

    expect(item).not.toBeNull();
    expect(item!.type).toBe('block');
    expect(item!.categoryKey).toBe('读书');
    expect(item!.tags).toContain('小说');
    expect(item!.tags).toContain('历史');
    expect(item!.date).toBe('2025-03-01');
    expect(item!.period).toBe('月');
    expect(item!.rating).toBe(8);
    expect(item!.content).toContain('这是内容');
    expect(item!.folder).toBe('blocks');
  });

  it('parses theme field separately (not mixed with tags)', () => {
    const lines = makeLines([
      '[!thinktxt]',
      '主题:: 工作项目',
      '标签:: 紧急',
      '内容:: 测试主题',
    ].join('\n'));

    const item = parseBlockContent(filePath, lines, 0, lines.length, folder);

    expect(item).not.toBeNull();
    expect(item!.theme).toBe('工作项目');
    expect(item!.tags).toContain('紧急');
    expect(item!.tags).not.toContain('工作项目');
  });

  it('falls back to parentFolder for categoryKey when no category field', () => {
    const lines = makeLines([
      '[!thinktxt]',
      '标签:: 测试',
      '内容:: 无分类',
    ].join('\n'));

    const item = parseBlockContent(filePath, lines, 0, lines.length, folder);

    expect(item).not.toBeNull();
    expect(item!.categoryKey).toBe('blocks');
  });

  it('parses icon and pintu fields', () => {
    const lines = makeLines([
      '[!thinktxt]',
      '图标:: 📚',
      '评图:: https://example.com/img.jpg',
      '内容:: 图标测试',
    ].join('\n'));

    const item = parseBlockContent(filePath, lines, 0, lines.length, folder);

    expect(item).not.toBeNull();
    expect(item!.icon).toBe('📚');
    expect(item!.pintu).toBe('https://example.com/img.jpg');
  });

  it('calculates periodCount when period and date are both present', () => {
    const lines = makeLines([
      '[!thinktxt]',
      '周期:: 月',
      '日期:: 2025-03-15',
      '内容:: 三月',
    ].join('\n'));

    const item = parseBlockContent(filePath, lines, 0, lines.length, folder);

    expect(item).not.toBeNull();
    expect(item!.periodCount).toBe(3); // March = month 3
  });

  it('handles extra KV fields', () => {
    const lines = makeLines([
      '[!thinktxt]',
      '自定义:: 值',
      '数量:: 5',
      '内容:: 额外字段',
    ].join('\n'));

    const item = parseBlockContent(filePath, lines, 0, lines.length, folder);

    expect(item).not.toBeNull();
    expect(item!.extra['自定义']).toBe('值');
    expect(item!.extra['数量']).toBe(5);
  });
});
