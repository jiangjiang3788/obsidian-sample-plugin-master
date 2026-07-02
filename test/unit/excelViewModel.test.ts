import {
  buildExcelContentModeButtonTitle,
  buildExcelViewRenderModel,
  getNextExcelContentDisplayMode,
  normalizeExcelColumnWidth,
  normalizeExcelColumnWidths,
  normalizeExcelContentDisplayMode,
} from '@/features/settings/views/runtime/excel-view/ExcelViewModel';

describe('ExcelViewModel', () => {
  it('normalizes column widths and content display mode', () => {
    expect(normalizeExcelColumnWidth(Number.NaN)).toBe(160);
    expect(normalizeExcelColumnWidth(20)).toBe(80);
    expect(normalizeExcelColumnWidth(800)).toBe(640);
    expect(normalizeExcelColumnWidths({ content: 188.7, title: -1 })).toEqual({ content: 189, title: 80 });
    expect(normalizeExcelContentDisplayMode('fullMarkdown')).toBe('fullMarkdown');
    expect(normalizeExcelContentDisplayMode('unknown')).toBe('previewText');
    expect(getNextExcelContentDisplayMode('fullMarkdown')).toBe('previewText');
  });

  it('builds render model and content mode title', () => {
    const model = buildExcelViewRenderModel({
      items: [{ id: '1', content: 'hello', fields: { score: 3 }, modified: 'm1' } as any],
      fields: ['content', 'score'],
      availableFields: ['content', 'score'],
      excelConfig: { columnWidths: { content: 200 }, contentDisplayMode: 'fullMarkdown' },
    });

    expect(model.displayFields).toEqual(['content', 'score']);
    expect(model.columns.map(column => column.canonicalField)).toContain('content');
    expect(model.persistedColumnWidths).toEqual({ content: 200 });
    expect(model.persistedContentDisplayMode).toBe('fullMarkdown');
    expect(model.hasContentColumn).toBe(true);
    expect(model.itemSignature).toBe('1:m1');
    expect(buildExcelContentModeButtonTitle({ hasContentColumn: false, excelConfigSaving: false, isFullMarkdownContent: false })).toContain('未显示内容字段');
    expect(buildExcelContentModeButtonTitle({ hasContentColumn: true, excelConfigSaving: true, isFullMarkdownContent: false })).toContain('正在保存');
  });
});
