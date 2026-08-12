import { describe, expect, it } from '@jest/globals';

import type { RecordEntity } from '@/core/records/RecordEntity';
import { encodeRecordBlock } from '@/core/records/codec/MarkdownRecordCodec';
import { RecordIndex } from '@/core/records/RecordIndex';
import { parseRecordBlock } from '@/core/utils/parser';

function parse(markdown: string, path: string): RecordEntity {
  const lines = markdown.split(/\r?\n/);
  const record = parseRecordBlock(path, lines, 0, lines.length - 1, '记录');
  if (!record) throw new Error(`parse failed: ${path}`);
  record.source = { path, startLine: 1, endLine: lines.length, modified: 1 };
  return record;
}

describe('integration: TaskSession integrity', () => {
  it('accepts a Task + Energy + Session graph produced by the canonical codec', () => {
    const task = parse(encodeRecordBlock({
      recordId: 'task.01KZQ1WW00HN6JRP7K368XHHVA', coreBlock: 'task',
      fields: { status: 'done', content: '怎么建立支点', completedAt: '2026-08-11T15:50:00.000Z' },
    }), 'task.md');
    const energy = parse(encodeRecordBlock({
      recordId: 'energy.01KZQ1WW00S4GA1V438BDV8RS8', coreBlock: 'energy',
      fields: { 日期: '2026-08-11', 时间: '15:24', 精力值: 60, 来源: 'desktop-panel' },
    }), 'energy.md');
    const session = parse(encodeRecordBlock({
      recordId: 'tasksession.01KZQ1WW00S4GA1V438BDV8RT0', coreBlock: 'task-session',
      fields: {
        taskId: task.id,
        sessionStartedAt: '2026-08-11T15:24:00.000Z',
        sessionEndedAt: '2026-08-11T15:50:00.000Z',
        sessionDurationMinutes: 26,
        sessionResult: 'task-completed',
        sessionSource: 'timer',
        startEnergyRecordId: energy.id,
      },
    }), 'session.md');

    const index = new RecordIndex();
    index.rebuild(new Map([['all.md', [task, energy, session]]]));
    expect(index.getIssues()).toEqual([]);
  });

  it('reports the Session when an Energy reference resolves to a non-Energy Record', () => {
    const task = parse(encodeRecordBlock({
      recordId: 'task.01KZQ1WW00HN6JRP7K368XHHVB', coreBlock: 'task', fields: { status: 'done', content: '任务' },
    }), 'task.md');
    const thought = parse(encodeRecordBlock({
      recordId: 'rec.01KZQ1WW00HN6JRP7K368XHHVC', coreBlock: 'thought', fields: { 内容: '不是精力记录' },
    }), 'thought.md');
    const session = parse(encodeRecordBlock({
      recordId: 'tasksession.01KZQ1WW00HN6JRP7K368XHHVD', coreBlock: 'task-session',
      fields: {
        taskId: task.id,
        sessionStartedAt: '2026-08-11T15:24:00.000Z',
        sessionEndedAt: '2026-08-11T15:50:00.000Z',
        sessionDurationMinutes: 26,
        sessionResult: 'task-completed',
        sessionSource: 'timer',
        startEnergyRecordId: thought.id,
      },
    }), 'session.md');

    const index = new RecordIndex();
    index.rebuild(new Map([['all.md', [task, thought, session]]]));
    expect(index.getIssues()).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'task_session_reference_orphan', recordId: session.id }),
    ]));
  });
});
