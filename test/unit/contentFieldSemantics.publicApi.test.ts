import * as corePublic from '@core/public';

/**
 * 第六版收口：内容字段与完整数据字段是两个独立字段，
 * 不再对外暴露“字段组合 / 一键加入”类 API，避免 UI 层误用成快捷入口。
 */
describe('content field semantics public api', () => {
  it('exports only independent content/fullData constants, not a field pair helper', () => {
    expect(corePublic.CONTENT_FIELD_KEY).toBe('content');
    expect(corePublic.FULL_DATA_FIELD_KEY).toBe('fullData');
    expect('CONTENT_FIELD_PAIR' in corePublic).toBe(false);
    expect('ensureContentFieldPair' in corePublic).toBe(false);
    expect('hasContentFieldPair' in corePublic).toBe(false);
    expect('getContentFieldPairMissingLabels' in corePublic).toBe(false);
  });
});
