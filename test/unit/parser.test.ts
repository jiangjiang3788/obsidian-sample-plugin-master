import { parseRecordBlock } from '@/core/utils/parser';
import { encodeRecordBlock } from '@/core/records/codec';

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
    expect(item!.status).toBe('open');
    expect(item!.content).toBe('整理代码');
    expect(item!.scheduledDate).toBe('2026-08-11');
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
    expect(item!.taskId).toBe(TASK_ID);
    expect(item!.sessionDurationMinutes).toBe(38);
    expect(item!.sessionResult).toBe('work-block-ended');
    expect(item!.sessionSource).toBe('timer');
  });

  it('rejects blocks without a stable Record ID instead of deriving identity from storage location', () => {
    const item = parse(['<!-- start -->', '记录版本:: 2', '核心Block:: task', '状态:: open', '内容:: no id', '<!-- end -->'].join('\n'));
    expect(item).toBeNull();
  });

});
