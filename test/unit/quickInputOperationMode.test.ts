import {
  getQuickInputFailureMessage,
  getQuickInputSubmitLabel,
  getQuickInputSuccessNotice,
  isQuickInputCreateOperation,
  isQuickInputUpdateOperation,
} from '../../src/platform/modals/quickInputOperationMode';

describe('quickInputOperationMode', () => {
  it('separates create/update semantics for edit operations', () => {
    expect(isQuickInputUpdateOperation('edit')).toBe(true);
    expect(isQuickInputUpdateOperation('convert')).toBe(true);
    expect(isQuickInputCreateOperation('duplicate')).toBe(true);
    expect(isQuickInputCreateOperation('convert')).toBe(false);
  });

  it('uses explicit submit labels for convert and duplicate modes', () => {
    expect(getQuickInputSubmitLabel('convert', false)).toBe('转换并保存');
    expect(getQuickInputSubmitLabel('convert', true)).toBe('转换中...');
    expect(getQuickInputSubmitLabel('duplicate', false)).toBe('另存为新记录');
    expect(getQuickInputSubmitLabel('duplicate', true)).toBe('另存中...');
  });

  it('keeps operation-specific feedback copy', () => {
    expect(getQuickInputFailureMessage('duplicate')).toBe('另存为新记录失败');
    expect(getQuickInputSuccessNotice('duplicate')).toBe('✅ 已另存为新记录');
    expect(getQuickInputSuccessNotice('convert', '✅ 已保存修改')).toBe('✅ 已转换记录类型');
    expect(getQuickInputSuccessNotice('convert', '✅ 已迁移保存：A → B')).toBe('✅ 已迁移保存：A → B');
  });
});
