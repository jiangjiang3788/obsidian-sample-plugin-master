import {
  findMatchingOption,
  isOptionLikeValue,
  readOptionText,
  toOptionObject,
} from '@/core/semantics/option';
import { normalizeHierarchyPath } from '@/core/fields/pathSemantics';


describe('field option semantics', () => {
  const options = [
    { value: 'todo', label: '待办' },
    { value: 'done', label: '完成' },
    { value: '学习/英语', label: '英语' },
  ];

  it('reads primitive and option-like values with stable value/label fallbacks', () => {
    expect(isOptionLikeValue({ label: '完成' })).toBe(true);
    expect(isOptionLikeValue('完成')).toBe(false);
    expect(readOptionText({ value: 'done', label: '完成' })).toEqual({ value: 'done', label: '完成' });
    expect(readOptionText({ label: '完成' })).toEqual({ value: '完成', label: '完成' });
    expect(readOptionText('待办')).toEqual({ value: '待办', label: '待办' });
  });

  it('matches options by value, label or normalized hierarchy path', () => {
    expect(findMatchingOption(options, '完成')).toEqual({ value: 'done', label: '完成' });
    expect(findMatchingOption(options, { value: 'todo' })).toEqual({ value: 'todo', label: '待办' });
    expect(findMatchingOption(options, '学习 / 英语', { normalize: normalizeHierarchyPath, matchLeaf: true })).toEqual({ value: '学习/英语', label: '英语' });
    expect(findMatchingOption(options, '英语', { normalize: normalizeHierarchyPath, matchLeaf: true })).toEqual({ value: '学习/英语', label: '英语' });
  });

  it('converts user selections into stable option objects only when meaningful', () => {
    expect(toOptionObject({ value: 'done', label: '完成' })).toEqual({ value: 'done', label: '完成' });
    expect(toOptionObject('')).toBeNull();
  });
});
