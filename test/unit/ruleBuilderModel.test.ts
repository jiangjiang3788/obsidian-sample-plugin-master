import {
  appendRule,
  buildRuleLabel,
  buildUniqueFieldValues,
  getPanelAddRuleGridTemplate,
  getPanelRuleGridTemplate,
  getRuleValuePlaceholder,
  isMultiValueOperator,
  normalizeFilterPatch,
  normalizeMultiValue,
  operatorNeedsValue,
  patchRuleRows,
  removeRuleAt,
  shouldShowRuleValueInput,
} from '@/features/settings/views/editors/RuleBuilderModel';

const filterRule = { field: 'status', op: '=', value: 'todo' } as any;
const sortRule = { field: 'created', dir: 'desc' } as any;

describe('RuleBuilderModel', () => {
  it('normalizes value operators without leaking UI state', () => {
    expect(operatorNeedsValue('empty' as any)).toBe(false);
    expect(operatorNeedsValue('=' as any)).toBe(true);
    expect(isMultiValueOperator('in' as any)).toBe(true);
    expect(getRuleValuePlaceholder('between' as any)).toContain('区间');
    expect(normalizeMultiValue(['a,b', 'a', ' c '])).toEqual(['a', 'b', 'c']);
  });

  it('normalizes filter patches for field and operator changes', () => {
    expect(normalizeFilterPatch({ field: 'priority' }, filterRule)).toEqual({ field: 'priority', value: '' });
    expect(normalizeFilterPatch({ op: 'empty' as any }, filterRule)).toEqual({ op: 'empty', value: '' });
    expect(normalizeFilterPatch({ op: 'in' as any, value: 'a,b' }, filterRule)).toEqual({ op: 'in', value: ['a', 'b'] });
  });

  it('patches, appends and removes rules immutably', () => {
    const rows = [filterRule, { field: 'priority', op: '=', value: 'high' }] as any[];
    expect(removeRuleAt(rows, 0)).toEqual([rows[1]]);
    expect(patchRuleRows('filter', rows, 0, { op: 'empty' as any })[0]).toMatchObject({ op: 'empty', value: '' });

    const appended = appendRule('filter', rows, { field: 'done', op: '=', value: 'yes' } as any) as any[];
    expect(appended).toHaveLength(3);
    expect(appended[1].logic).toBe('and');
  });

  it('builds labels, grid templates and value input decisions', () => {
    expect(buildRuleLabel('filter', filterRule)).toContain('status');
    expect(buildRuleLabel('sort', sortRule)).toContain('降序');
    expect(shouldShowRuleValueInput('filter', { field: 'x', op: 'empty', value: '' } as any)).toBe(false);
    expect(getPanelRuleGridTemplate('filter', true)).toContain('260px');
    expect(getPanelAddRuleGridTemplate('sort', true)).toContain('auto');
  });

  it('collects unique field values from the data store', () => {
    const dataStore = {
      queryItems: () => [
        { id: '1', title: 'todo', tags: ['a', 'b'], extra: {} },
        { id: '2', title: 'done', tags: ['a'], extra: {} },
      ],
    } as any;

    const result = buildUniqueFieldValues(dataStore);
    expect(result.title).toEqual(['done', 'todo']);
    expect(result.tags).toEqual(['a', 'b']);
  });
});
