import {
  getQuickInputSelectedValue,
  isQuickInputChoiceSelected,
  normalizeQuickInputChoices,
  toQuickInputOptionObject,
} from '@features/quickinput/editor/components/quickInputOptionSelection';

describe('quickInputOptionSelection', () => {
  it('normalizes primitive and object options for visible single-select pills', () => {
    expect(normalizeQuickInputChoices(['Todo', { value: 'doing', label: 'Doing' }, { label: 'Done' }])).toEqual([
      { value: 'Todo', label: 'Todo' },
      { value: 'doing', label: 'Doing' },
      { value: 'Done', label: 'Done' },
    ]);
  });

  it('detects selected values from both stored option objects and primitive values', () => {
    const choice = { value: 'doing', label: 'Doing' };

    expect(isQuickInputChoiceSelected({ value: 'doing', label: 'Doing' }, choice)).toBe(true);
    expect(isQuickInputChoiceSelected('doing', choice)).toBe(true);
    expect(isQuickInputChoiceSelected('Doing', choice)).toBe(true);
    expect(isQuickInputChoiceSelected('todo', choice)).toBe(false);
  });

  it('stores selected single-select choices as option objects', () => {
    expect(toQuickInputOptionObject({ value: 'done', label: 'Done' })).toEqual({ value: 'done', label: 'Done' });
    expect(getQuickInputSelectedValue({ value: 'done', label: 'Done' })).toBe('done');
  });
});
