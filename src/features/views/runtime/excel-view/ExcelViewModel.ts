import { getAllFields, type RecordViewItem } from '@core/types/public';
import { normalizeDisplayFields } from '@core/view/public';
import { orderItemsByDisplayedGoalField } from '@core/utils/public';
import type { GoalDefinition } from '@core/goal/public';
import { buildExcelColumns } from './value';
import type { ExcelColumnModel, ExcelColumnWidthMap, ExcelContentDisplayMode, ExcelViewDisplayConfig } from './types';

export interface ExcelViewRenderModelInput {
  items: RecordViewItem[];
  goals?: GoalDefinition[];
  fields?: string[];
  availableFields?: string[];
  excelConfig?: ExcelViewDisplayConfig;
}

export interface ExcelViewRenderModel {
  discoveredFields: string[];
  normalizedAvailableFields: string[];
  displayFields: string[];
  columns: ExcelColumnModel[];
  orderedItems: RecordViewItem[];
  itemSignature: string;
  persistedColumnWidths: ExcelColumnWidthMap;
  persistedContentDisplayMode: ExcelContentDisplayMode;
  editableColumnCount: number;
  readonlyColumnCount: number;
  hasContentColumn: boolean;
}

export function normalizeExcelColumnWidth(width: number): number {
  if (!Number.isFinite(width)) return 160;
  return Math.max(80, Math.min(640, Math.round(width)));
}

export function normalizeExcelColumnWidths(widths?: ExcelColumnWidthMap): ExcelColumnWidthMap {
  if (!widths) return {};
  const next: ExcelColumnWidthMap = {};
  for (const [field, width] of Object.entries(widths)) {
    if (!field) continue;
    next[field] = normalizeExcelColumnWidth(Number(width));
  }
  return next;
}

export function normalizeExcelContentDisplayMode(mode?: string): ExcelContentDisplayMode {
  return mode === 'fullMarkdown' ? 'fullMarkdown' : 'previewText';
}

export function getNextExcelContentDisplayMode(mode: ExcelContentDisplayMode): ExcelContentDisplayMode {
  return mode === 'fullMarkdown' ? 'previewText' : 'fullMarkdown';
}

export function buildExcelContentModeButtonTitle(input: {
  hasContentColumn: boolean;
  excelConfigSaving: boolean;
  isFullMarkdownContent: boolean;
}): string {
  if (!input.hasContentColumn) return '当前表格未显示内容字段，请先在字段栏添加 content/内容字段';
  if (input.excelConfigSaving) return '正在保存 Excel 视图配置';
  return input.isFullMarkdownContent
    ? '当前：内容字段显示完整 Markdown；点击切回短文本预览'
    : '当前：内容字段短文本预览；点击显示完整 Markdown';
}

export function buildExcelViewRenderModel({
  items,
  goals = [],
  fields,
  availableFields,
  excelConfig,
}: ExcelViewRenderModelInput): ExcelViewRenderModel {
  const discoveredFields = getAllFields(items);
  const normalizedAvailableFields = normalizeDisplayFields(
    availableFields?.length ? availableFields : discoveredFields,
    { includeUnknown: false },
  );
  const displayFields = normalizeDisplayFields(
    fields && fields.length ? fields : normalizedAvailableFields,
    {
      availableFields: normalizedAvailableFields,
      includeUnknown: true,
      fallbackFields: normalizedAvailableFields,
    },
  );
  const columns = buildExcelColumns(displayFields);
  const orderedItems = orderItemsByDisplayedGoalField(items, displayFields, { goals });
  const itemSignature = orderedItems.map(item => `${item.id}:${item.modified ?? ''}`).join('|');
  const persistedColumnWidths = normalizeExcelColumnWidths(excelConfig?.columnWidths);
  const persistedContentDisplayMode = normalizeExcelContentDisplayMode(excelConfig?.contentDisplayMode);
  const editableColumnCount = columns.filter(column => column.editable).length;
  const readonlyColumnCount = Math.max(0, columns.length - editableColumnCount);
  const hasContentColumn = columns.some(column => column.canonicalField === 'content');

  return {
    discoveredFields,
    normalizedAvailableFields,
    displayFields,
    columns,
    orderedItems,
    itemSignature,
    persistedColumnWidths,
    persistedContentDisplayMode,
    editableColumnCount,
    readonlyColumnCount,
    hasContentColumn,
  };
}
