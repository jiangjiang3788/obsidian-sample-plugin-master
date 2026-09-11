/**
 * @covers F153/unit
 * @covers F153/regression
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  RECORD_TYPE_PRESENTATION_ORDER,
  RECORD_TYPE_PRESENTATION_REGISTRY,
  compareRecordTypeKeys,
  getRecordTypePresentation,
  normalizeRecordTypePresentationKey,
  sortRecordTypesByPresentation,
} from '@core/recordTypes/public';

const EXPECTED = [
  'task', 'task-session', 'task-series', 'energy', 'habit', 'evidence',
  'thought', 'review', 'plan', 'blocker', 'milestone',
];

describe('Record Type presentation contract', () => {
  it('locks the one global order for all 11 canonical Record kinds', () => {
    expect([...RECORD_TYPE_PRESENTATION_ORDER]).toEqual(EXPECTED);
    expect(Object.keys(RECORD_TYPE_PRESENTATION_REGISTRY)).toHaveLength(11);
    expect(sortRecordTypesByPresentation([...EXPECTED].reverse(), (value) => value)).toEqual(EXPECTED);
  });

  it('normalizes canonical ids and Chinese labels to the same type identity', () => {
    expect(normalizeRecordTypePresentationKey('core.task')).toBe('task');
    expect(normalizeRecordTypePresentationKey('internal.task-session')).toBe('task-session');
    expect(normalizeRecordTypePresentationKey('任务工作块')).toBe('task-session');
    expect(normalizeRecordTypePresentationKey('事件')).toBe('evidence');
    expect(compareRecordTypeKeys('任务', '精力')).toBeLessThan(0);
    expect(compareRecordTypeKeys('总结', '计划')).toBeLessThan(0);
  });

  it('gives every type a unique semantic color token while labels stay schema-owned', () => {
    const presentations = EXPECTED.map(getRecordTypePresentation);
    expect(new Set(presentations.map((item) => item.colorToken)).size).toBe(11);
    expect(getRecordTypePresentation('task').label).toBe('任务');
    expect(getRecordTypePresentation('task-session').label).toBe('任务工作块');
    expect(getRecordTypePresentation('milestone').label).toBe('里程碑');
  });

  it('defines 11 distinct concrete light-theme color values in the global token source', () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tokens/data-colors.css'), 'utf8');
    const values = EXPECTED.map((key) => {
      const match = css.match(new RegExp(`--think-record-type-${key}:\\s*([^;]+);`));
      expect(match?.[1]).toBeTruthy();
      return match?.[1]?.trim();
    });
    expect(new Set(values).size).toBe(11);
  });

});
