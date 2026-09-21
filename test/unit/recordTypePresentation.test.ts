/**
 * @covers F153/unit
 * @covers F153/regression
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  RECORD_TYPE_PRESENTATION_ORDER,
  RECORD_TYPE_PRESENTATION_REGISTRY,
  normalizeRecordTypeColorHex,
  normalizeRecordTypeColorOverrides,
  compareRecordTypeKeys,
  getRecordTypePresentation,
  normalizeRecordTypePresentationKey,
  sortRecordTypesByPresentation,
} from '@core/recordTypes/public';

const EXPECTED = [
  'task', 'energy', 'habit', 'event', 'feeling', 'thought', 'review', 'plan', 'blocker', 'milestone',
];

describe('Record Type presentation contract', () => {
  it('locks one global order for the 10 user-visible Record kinds', () => {
    expect([...RECORD_TYPE_PRESENTATION_ORDER]).toEqual(EXPECTED);
    expect(Object.keys(RECORD_TYPE_PRESENTATION_REGISTRY)).toHaveLength(10);
    expect(sortRecordTypesByPresentation([...EXPECTED].reverse(), (value) => value)).toEqual(EXPECTED);
  });

  it('normalizes internal Task entities to the one user-facing Task identity', () => {
    expect(normalizeRecordTypePresentationKey('core.task')).toBe('task');
    expect(normalizeRecordTypePresentationKey('internal.task-session')).toBe('task');
    expect(normalizeRecordTypePresentationKey('任务工作块')).toBe('task');
    expect(normalizeRecordTypePresentationKey('internal.task-series')).toBe('task');
    expect(normalizeRecordTypePresentationKey('任务系列')).toBe('task');
    expect(normalizeRecordTypePresentationKey('事件')).toBe('event');
    expect(compareRecordTypeKeys('任务', '精力')).toBeLessThan(0);
    expect(compareRecordTypeKeys('总结', '计划')).toBeLessThan(0);
  });

  it('gives each user type one semantic color token and internal Task entities inherit Task', () => {
    const presentations = EXPECTED.map(getRecordTypePresentation);
    expect(new Set(presentations.map((item) => item.colorToken)).size).toBe(10);
    expect(presentations.every((item) => Boolean(item.icon))).toBe(true);
    expect(getRecordTypePresentation('task').label).toBe('任务');
    expect(getRecordTypePresentation('task-session')).toMatchObject({ label: '任务', colorToken: '--think-record-type-task' });
    expect(getRecordTypePresentation('task-series')).toMatchObject({ label: '任务', colorToken: '--think-record-type-task' });
    expect(getRecordTypePresentation('milestone').label).toBe('里程碑');
  });


  it('normalizes only canonical user color overrides and rejects internal/unknown keys', () => {
    expect(normalizeRecordTypeColorHex('#ABC')).toBe('#aabbcc');
    expect(normalizeRecordTypeColorHex('bad')).toBeNull();
    expect(normalizeRecordTypeColorOverrides({
      task: '#ABC',
      feeling: '#123456',
      'task-session': '#ffffff',
      unknown: '#000000',
      thought: 'not-a-color',
    })).toEqual({ task: '#aabbcc', feeling: '#123456' });
  });

  it('Timeline uses one Record Type identity edge and Goal color only as fill', () => {
    const recordTypeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/components/record-type.css'), 'utf8');
    const timelineCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/features/timeline.css'), 'utf8');
    const timelineBlock = fs.readFileSync(path.resolve(process.cwd(), 'src/features/views/runtime/components/timeline/TimelineTaskBlock.tsx'), 'utf8');
    expect(recordTypeCss).toContain('border-inline-start: 3px solid var(--think-record-type-accent)');
    expect(timelineCss).toContain('var(--timeline-goal-color');
    expect(timelineCss).not.toContain('.timeline-task-indicator');
    expect(timelineBlock).not.toContain('timeline-task-indicator');
    expect(timelineCss).not.toContain('--timeline-task-color');
    expect(timelineCss).toContain('--timeline-goal-color');
    expect(timelineBlock).not.toContain('data-record-type="task"');
    expect(recordTypeCss).not.toContain('.timeline-task-block[data-record-type]');
  });

  it('defines 10 distinct concrete light-theme color values in the global token source', () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tokens/data-colors.css'), 'utf8');
    const values = EXPECTED.map((key) => {
      const match = css.match(new RegExp(`--think-record-type-${key}:\\s*([^;]+);`));
      expect(match?.[1]).toBeTruthy();
      return match?.[1]?.trim();
    });
    expect(new Set(values).size).toBe(10);
  });
});
