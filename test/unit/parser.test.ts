import { parseRecordBlock } from '@/core/utils/parser';
import { encodeRecordBlock } from '@/core/records/codec';
import { asTaskRecord } from '@/core/records/task/taskDomain';
import { asTaskSessionRecord } from '@/core/records/task/taskSession';

const TASK_ID = 'task.01J00000000000000000000000';
const REC_ID = 'rec.01J00000000000000000000000';

function parse(markdown: string, filePath = 'test/records.md') {
  const lines = markdown.split('\n');
  return parseRecordBlock(filePath, lines, 0, lines.length - 1, 'test');
}

describe('Record Foundation v2 parser', () => {
  it('reads a Task v2 Record Block with stable identity', () => {
    const markdown = encodeRecordBlock({
      recordId: TASK_ID,
      coreBlock: 'task',
      fields: { status: 'open', content: '整理代码', goalId: 'goal.demo', themePath: '工作/开发', scheduledDate: '2026-08-11' },
    });
    const item = parse(markdown);
    expect(item).not.toBeNull();
    expect(item!.id).toBe(TASK_ID);
    expect(item!.schemaVersion).toBe(2);
    expect(item!.coreBlock).toBe('task');
    const task = asTaskRecord(item);
    expect(task?.status).toBe('open');
    expect(item!.content).toBe('整理代码');
    expect(task?.scheduledDate).toBe('2026-08-11');
  });

  it('reads ordinary Record Blocks through the same codec/parser', () => {
    const markdown = encodeRecordBlock({ recordId: REC_ID, coreBlock: 'thought', fields: { 分类: '思考', 内容: '统一 Record parser', 主题: '系统' } });
    const item = parse(markdown);
    expect(item).not.toBeNull();
    expect(item!.id).toBe(REC_ID);
    expect(item!.coreBlock).toBe('thought');
    expect(item!.content).toBe('统一 Record parser');
  });

  it('reads a Task Session v2 Record Block as an internal Record', () => {
    const sessionId = 'tasksession.01J00000000000000000000000';
    const markdown = encodeRecordBlock({
      recordId: sessionId,
      coreBlock: 'task-session',
      fields: {
        taskId: TASK_ID,
        sessionStartedAt: '2026-08-11T09:10:00.000Z',
        sessionEndedAt: '2026-08-11T09:48:00.000Z',
        sessionDurationMinutes: 38,
        sessionResult: 'work-block-ended',
        sessionSource: 'timer',
        suggestedDurationMinutes: 45,
      },
    });
    const item = parse(markdown);
    expect(item).not.toBeNull();
    expect(item!.id).toBe(sessionId);
    expect(item!.coreBlock).toBe('task-session');
    const session = asTaskSessionRecord(item);
    expect(session?.taskId).toBe(TASK_ID);
    expect(session?.sessionDurationMinutes).toBe(38);
    expect(session?.sessionResult).toBe('work-block-ended');
    expect(session?.sessionSource).toBe('timer');
  });

  it('rejects blocks without a stable Record ID instead of deriving identity from storage location', () => {
    const item = parse(['<!-- start -->', '记录版本:: 2', '核心Block:: task', '状态:: open', '内容:: no id', '<!-- end -->'].join('\n'));
    expect(item).toBeNull();
  });

  it('treats single-colon prose and double-colon text after 内容 as body, never fields', () => {
    const markdown = [
      '<!-- start -->',
      `记录ID:: ${REC_ID}`,
      '记录版本:: 2',
      '核心Block:: thought',
      '目标ID:: goal.self',
      '目标:: 了解自我',
      '内容:: 第一行',
      '晚上：脑子有点蒙',
      '7:30 起床',
      '生活主线:: 这也是正文，不是字段',
      '<!-- end -->',
    ].join('\n');
    const item = parse(markdown);
    expect(item).not.toBeNull();
    expect(item!.content).toContain('晚上：脑子有点蒙');
    expect(item!.content).toContain('生活主线:: 这也是正文，不是字段');
    expect(item!.extra).not.toHaveProperty('晚上');
    expect(item!.extra).not.toHaveProperty('生活主线');
  });

  it('allows schema kinds without 内容 and does not invent a body', () => {
    const id = 'energy.01J00000000000000000000000';
    const markdown = [
      '<!-- start -->',
      `记录ID:: ${id}`,
      '记录版本:: 2',
      '核心Block:: energy',
      '记录子类型:: snapshot',
      '目标ID:: goal.self',
      '目标:: 照顾好自己',
      '日期:: 2026-08-12',
      '时间:: 10:30',
      '精力值:: 65',
      '<!-- end -->',
    ].join('\n');
    const item = parse(markdown);
    expect(item).not.toBeNull();
    expect(item!.content).toBe('');
    expect(item!.extra['精力值']).toBe(65);
  });

  it('keeps explicit custom metadata before 内容 as extra', () => {
    const markdown = encodeRecordBlock({
      recordId: REC_ID,
      coreBlock: 'thought',
      fields: { 清晰度: 4, 内容: '正文' },
    });
    expect(markdown.indexOf('清晰度:: 4')).toBeLessThan(markdown.indexOf('内容:: 正文'));
    const item = parse(markdown);
    expect(item?.extra['清晰度']).toBe(4);
  });

});
