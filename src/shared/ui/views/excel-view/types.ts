import type { Item } from '@core/types/public';
import type { FieldCommitMode, FieldEditDangerLevel, FieldEditPolicy, FieldEditorKind } from '@core/fields/public';
import type { MessageRenderPort } from '@core/ports/public';
import type { GoalDefinition } from '@core/goal/public';

export type ExcelCellCommitReason = 'inline-edit' | 'fill-drag' | 'paste';
export type ExcelCellSaveState = 'idle' | 'pending' | 'saved' | 'error';
export type ExcelNavigationDirection = 'up' | 'down' | 'left' | 'right' | 'next' | 'previous';
export type ExcelContentDisplayMode = 'previewText' | 'fullMarkdown';

export interface ExcelCellAddress {
  itemId: string;
  field: string;
}

export interface ExcelCellCommitRequest {
  item: Item;
  itemId: string;
  field: string;
  canonicalField: string;
  oldValue: unknown;
  nextValue: unknown;
  reason: ExcelCellCommitReason;
}

export interface ExcelCellCommitResult {
  ok: boolean;
  message?: string;
  normalizedValue?: unknown;
}

export interface ExcelCellBatchEdit {
  cell: ExcelCellModel;
  editorValue: string;
}

export type ExcelCellCommitHandler = (request: ExcelCellCommitRequest) => Promise<ExcelCellCommitResult> | ExcelCellCommitResult;
export type ExcelOpenRecordHandler = (item: Item) => void;
export type ExcelDisplayFieldsChangeHandler = (fields: string[]) => Promise<void> | void;
export type ExcelColumnWidthMap = Record<string, number>;

export interface ExcelViewDisplayConfig {
  columnWidths?: ExcelColumnWidthMap;
  /** content 字段在 Excel 表格中的展示方式：默认短文本预览，用户可切换为全文 Markdown。 */
  contentDisplayMode?: ExcelContentDisplayMode;
}

export type ExcelDisplayConfigChangeHandler = (config: ExcelViewDisplayConfig) => Promise<void> | void;

export interface ExcelColumnModel {
  key: string;
  canonicalField: string;
  label: string;
  editable: boolean;
  editorKind: FieldEditorKind;
  commitMode: FieldCommitMode;
  dangerLevel: FieldEditDangerLevel;
  readonlyReason?: string;
}

export interface ExcelCellModel {
  item: Item;
  itemId: string;
  field: string;
  canonicalField: string;
  value: unknown;
  displayValue: string;
  editorValue: string;
  policy: FieldEditPolicy;
}

export interface ExcelViewProps {
  items: Item[];
  goals?: GoalDefinition[];
  fields?: string[];
  availableFields?: string[];
  onFieldsChange?: ExcelDisplayFieldsChangeHandler;
  excelConfig?: ExcelViewDisplayConfig;
  onExcelConfigChange?: ExcelDisplayConfigChangeHandler;
  onCellCommit?: ExcelCellCommitHandler;
  onOpenRecord?: ExcelOpenRecordHandler;
  messageRenderPort?: MessageRenderPort;
}

export interface ExcelGridProps {
  items: Item[];
  columns: ExcelColumnModel[];
  selectedCellKey?: string | null;
  editingCellKey?: string | null;
  pendingCellKeys?: ReadonlySet<string>;
  cellErrors?: Readonly<Record<string, string | undefined>>;
  valueOverrides?: Readonly<Record<string, unknown>>;
  savedCellKeys?: ReadonlySet<string>;
  canCommitCells?: boolean;
  columnWidths?: Readonly<ExcelColumnWidthMap>;
  contentDisplayMode?: ExcelContentDisplayMode;
  messageRenderPort?: MessageRenderPort;
  fillDragSourceCell?: ExcelCellModel | null;
  fillDragTargetCellKey?: string | null;
  onSelectCell?: (cell: ExcelCellModel) => void;
  onStartEdit?: (cell: ExcelCellModel) => void;
  onCancelEdit?: () => void;
  onCommitEdit?: (cell: ExcelCellModel, nextValue: string) => void;
  onCommitBatchEdits?: (edits: ExcelCellBatchEdit[], reason: ExcelCellCommitReason) => void;
  onStartFillDrag?: (cell: ExcelCellModel) => void;
  onMoveFillDrag?: (cell: ExcelCellModel) => void;
  onFinishFillDrag?: (cells: ExcelCellModel[]) => void;
  onCancelFillDrag?: () => void;
  onColumnWidthDraftChange?: (field: string, width: number) => void;
  onColumnWidthCommit?: (field: string, width: number) => void;
  onOpenRecord?: ExcelOpenRecordHandler;
}

export interface ExcelCellProps {
  cell: ExcelCellModel;
  selected?: boolean;
  editing?: boolean;
  pending?: boolean;
  saved?: boolean;
  error?: string;
  canCommit?: boolean;
  style?: any;
  fillDragging?: boolean;
  fillSource?: boolean;
  fillTarget?: boolean;
  contentDisplayMode?: ExcelContentDisplayMode;
  messageRenderPort?: MessageRenderPort;
  onSelect?: (cell: ExcelCellModel) => void;
  onStartEdit?: (cell: ExcelCellModel) => void;
  onCancelEdit?: () => void;
  onCommitEdit?: (cell: ExcelCellModel, nextValue: string) => void;
  onNavigate?: (cell: ExcelCellModel, direction: ExcelNavigationDirection) => void;
  onPasteText?: (cell: ExcelCellModel, text: string) => void;
  onStartFillDrag?: (cell: ExcelCellModel) => void;
  onMoveFillDrag?: (cell: ExcelCellModel) => void;
  onFinishFillDrag?: (cell: ExcelCellModel) => void;
  onCancelFillDrag?: () => void;
  onColumnWidthDraftChange?: (field: string, width: number) => void;
  onColumnWidthCommit?: (field: string, width: number) => void;
  onOpenRecord?: ExcelOpenRecordHandler;
}

export interface ExcelCellEditingState {
  selectedCellKey: string | null;
  editingCellKey: string | null;
  pendingCellKeys: ReadonlySet<string>;
  cellErrors: Readonly<Record<string, string | undefined>>;
  valueOverrides: Readonly<Record<string, unknown>>;
  savedCellKeys: ReadonlySet<string>;
  fillDragSourceCell: ExcelCellModel | null;
  fillDragTargetCellKey: string | null;
  selectCell(cell: ExcelCellModel): void;
  startEdit(cell: ExcelCellModel): void;
  cancelEdit(): void;
  commitEdit(cell: ExcelCellModel, nextEditorValue: string): Promise<void>;
  commitBatchEdits(edits: ExcelCellBatchEdit[], reason: ExcelCellCommitReason): Promise<void>;
  startFillDrag(cell: ExcelCellModel): void;
  moveFillDrag(cell: ExcelCellModel): void;
  finishFillDrag(cells: ExcelCellModel[]): Promise<void>;
  cancelFillDrag(): void;
  resetTransientState(): void;
}

export interface UseExcelCellEditingOptions {
  onCellCommit?: ExcelCellCommitHandler;
}

export interface ExcelEditorDescriptor {
  tag: 'input' | 'textarea' | 'select';
  type?: string;
  hint: string;
}

export interface ExcelEditorOption {
  value: string;
  label: string;
}

export function getExcelCellKey(itemId: string, field: string): string {
  return `${itemId}::${field}`;
}

export function canInlineEditExcelCell(cell: ExcelCellModel, canCommit = true): boolean {
  return !!canCommit && cell.policy.editable && cell.policy.commitMode === 'inline';
}

export function getExcelEditorDescriptor(kind: FieldEditorKind): ExcelEditorDescriptor {
  if (kind === 'textarea') return { tag: 'textarea', hint: 'Enter 保存 · Shift+Enter 换行 · Esc 取消' };
  if (kind === 'number') return { tag: 'input', type: 'number', hint: '数字编辑器：Enter 保存 · Esc 取消' };
  if (kind === 'rating') return { tag: 'input', type: 'number', hint: '评分编辑器：输入数字，Enter 保存 · Esc 取消' };
  if (kind === 'date') return { tag: 'input', type: 'date', hint: '日期编辑器：Enter 保存 · Esc 取消' };
  if (kind === 'time') return { tag: 'input', type: 'time', hint: '时间编辑器：Enter 保存 · Esc 取消' };
  if (kind === 'datetime') return { tag: 'input', type: 'datetime-local', hint: '日期时间编辑器：Enter 保存 · Esc 取消' };
  if (kind === 'boolean') return { tag: 'select', hint: '布尔编辑器：选择 是 / 否，Enter 保存 · Esc 取消' };
  if (kind === 'select') return { tag: 'select', hint: '选项编辑器：选择后 Enter 保存 · Esc 取消' };
  if (kind === 'tags') return { tag: 'input', type: 'text', hint: '标签编辑器：逗号/换行分隔，# 会保留' };
  return { tag: 'input', type: 'text', hint: 'Enter 保存 · Esc 取消' };
}

export interface ExcelColumnToolbarProps {
  fields: string[];
  availableFields: string[];
  disabled?: boolean;
  saving?: boolean;
  error?: string | null;
  getFieldLabel?: (field: string) => string;
  getFieldGroupLabel?: (field: string) => string;
  onFieldsChange?: ExcelDisplayFieldsChangeHandler;
}
