import {
  extractTaskContextTokens,
  mergeTaskLinePreservingSourceContext,
  preserveTaskCheckboxStatus,
  taskLineContainsTokenIdentity,
} from '@/core/recordInput/mutation/TaskLinePatch';

describe('task line patch helpers', () => {
  it('extracts task context tokens in stable order', () => {
    expect(extractTaskContextTokens('- [ ] 复习 #英语 📅 2026-07-01 🔁 every week (goal::学习) #英语')).toEqual([
      '#英语',
      '📅 2026-07-01',
      '🔁 every week',
      '(goal::学习)',
    ]);
  });

  it('preserves checkbox status when template output changes it', () => {
    expect(preserveTaskCheckboxStatus('- [x] 已完成', '- [ ] 新标题')).toBe('- [x] 新标题');
  });

  it('recognizes equivalent token identities', () => {
    expect(taskLineContainsTokenIdentity('- [ ] 任务 📅 2026-07-02', '📅 2026-07-01')).toBe(true);
    expect(taskLineContainsTokenIdentity('- [ ] 任务 (goal::学习)', '(goal::工作)')).toBe(true);
    expect(taskLineContainsTokenIdentity('- [ ] 任务 #英语', '#英语')).toBe(true);
  });

  it('merges missing source context tokens into rendered task line', () => {
    const original = '- [x] 旧任务 #英语 📅 2026-07-01 🔁 every week (goal::学习)';
    const rendered = '- [ ] 新任务 #英语';
    expect(mergeTaskLinePreservingSourceContext(original, rendered)).toBe('- [x] 新任务 #英语 📅 2026-07-01 🔁 every week (goal::学习)');
  });

  it('does not merge multi-line rendered output', () => {
    expect(mergeTaskLinePreservingSourceContext('- [ ] 旧任务 #英语', '- [ ] 新任务\n附加说明')).toBe('- [ ] 新任务\n附加说明');
  });
});
