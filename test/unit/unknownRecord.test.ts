import {
  asUnknownRecord,
  isUnknownRecord,
  readBoolean,
  readFirstString,
  readNumber,
  readRecord,
  readRecordArray,
  readString,
  readStringArray,
  readTrimmedString,
} from '@core/utils/unknownRecord';

describe('unknownRecord boundary helpers', () => {
  it('accepts plain records and rejects arrays/null/primitives', () => {
    expect(isUnknownRecord({ title: '任务' })).toBe(true);
    expect(isUnknownRecord([])).toBe(false);
    expect(isUnknownRecord(null)).toBe(false);
    expect(isUnknownRecord('任务')).toBe(false);
    expect(asUnknownRecord({ ok: true })).toEqual({ ok: true });
    expect(asUnknownRecord(['x'])).toBeUndefined();
  });

  it('reads primitive fields without coercing unsafe values', () => {
    const record = asUnknownRecord({
      title: '任务',
      blank: '   ',
      count: 3,
      badNumber: Number.NaN,
      done: false,
      numericString: '3',
    });

    expect(readString(record, 'title')).toBe('任务');
    expect(readTrimmedString(record, 'blank')).toBeUndefined();
    expect(readNumber(record, 'count')).toBe(3);
    expect(readNumber(record, 'badNumber')).toBeUndefined();
    expect(readNumber(record, 'numericString')).toBeUndefined();
    expect(readBoolean(record, 'done')).toBe(false);
  });

  it('filters string arrays and record arrays', () => {
    const record = asUnknownRecord({
      tags: ['a', 1, 'b', null],
      items: [{ id: '1' }, null, ['x'], { id: '2' }],
    });

    expect(readStringArray(record, 'tags')).toEqual(['a', 'b']);
    expect(readRecordArray(record, 'items')).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('reads nested records and first non-empty string from aliases', () => {
    const record = asUnknownRecord({
      meta: { goalPath: '工作/插件' },
      title: '   ',
      content: '完成 MVP26',
    });

    expect(readRecord(record, 'meta')).toEqual({ goalPath: '工作/插件' });
    expect(readFirstString(record, ['title', 'content'])).toBe('完成 MVP26');
    expect(readFirstString(record, ['missing', 'title'])).toBeUndefined();
  });
});
