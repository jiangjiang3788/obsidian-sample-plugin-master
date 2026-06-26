import { getExcelEditorOptions } from './value';
import { canInlineEditExcelCell, getExcelCellKey, getExcelEditorDescriptor } from './types';
import type { ExcelCellModel, ExcelContentDisplayMode, ExcelEditorDescriptor, ExcelEditorOption, ExcelNavigationDirection } from './types';

export type ExcelCellEditorKeyAction = 'none' | 'cancel-edit' | 'commit-edit';
export type ExcelCellKeyAction =
  | { type: 'none' }
  | { type: 'cancel-fill-drag' }
  | { type: 'navigate'; direction: ExcelNavigationDirection }
  | { type: 'start-edit' };

export interface ExcelCellUiState {
  editable: boolean;
  readonly: boolean;
  descriptor: ExcelEditorDescriptor;
  editorOptions: ExcelEditorOption[];
  cellKey: string;
  isContentCell: boolean;
  contentText: string;
  showFullMarkdownContent: boolean;
  title: string;
  className: string;
  saveState: 'pending' | 'error' | 'saved' | 'idle';
}

export function readExcelKeyboardValue(event: KeyboardEvent): string {
  const target = event.currentTarget as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  return target.value;
}

export function getExcelReadonlyTitle(policyReason?: string): string {
  return policyReason || '该字段不可在 Excel 单元格中直接编辑';
}

export function getExcelTypedInputProps(kind: string): Record<string, string | number> {
  if (kind === 'number') return { step: 'any' };
  if (kind === 'rating') return { step: 1, min: 0, max: 5 };
  return {};
}

export function isExcelMarkdownInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest('a, button, input, textarea, select, .internal-link, .external-link, .tag');
}

export function buildExcelCellTitle(params: {
  error?: string;
  editable: boolean;
  policyReason?: string;
}): string {
  const { error, editable, policyReason } = params;
  if (error) return error;
  return editable
    ? '双击/F2/Enter 编辑；方向键/Tab 移动；可粘贴多行多列；拖动右下角小方块可向同列覆盖；Ctrl/⌘ 点击打开完整编辑'
    : `${getExcelReadonlyTitle(policyReason)}；Ctrl/⌘ 点击可打开完整编辑`;
}

export function buildExcelCellClassName(params: {
  editable: boolean;
  policyEditable: boolean;
  dangerLevel: string;
  isContentCell: boolean;
  showFullMarkdownContent: boolean;
  selected: boolean;
  editing: boolean;
  pending: boolean;
  saved: boolean;
  error?: string;
  fillSource: boolean;
  fillTarget: boolean;
}): string {
  const {
    editable,
    policyEditable,
    dangerLevel,
    isContentCell,
    showFullMarkdownContent,
    selected,
    editing,
    pending,
    saved,
    error,
    fillSource,
    fillTarget,
  } = params;
  return [
    'excel-view-cell',
    editable ? 'is-inline-editable' : 'is-readonly',
    policyEditable ? 'is-policy-editable' : 'is-policy-readonly',
    dangerLevel === 'medium' ? 'is-medium-risk' : '',
    dangerLevel === 'high' ? 'is-high-risk' : '',
    isContentCell ? 'is-content-cell' : '',
    showFullMarkdownContent ? 'is-content-expanded' : '',
    selected ? 'is-selected' : '',
    editing ? 'is-editing' : '',
    pending ? 'is-pending' : '',
    saved && !pending && !error ? 'is-saved' : '',
    error ? 'has-error' : '',
    fillSource ? 'is-fill-source' : '',
    fillTarget ? 'is-fill-target' : '',
  ].filter(Boolean).join(' ');
}

export function getExcelCellSaveState(params: { pending: boolean; saved: boolean; error?: string }): 'pending' | 'error' | 'saved' | 'idle' {
  if (params.pending) return 'pending';
  if (params.error) return 'error';
  if (params.saved) return 'saved';
  return 'idle';
}

export function buildExcelCellUiState(params: {
  cell: ExcelCellModel;
  selected?: boolean;
  editing?: boolean;
  pending?: boolean;
  saved?: boolean;
  error?: string;
  canCommit?: boolean;
  fillSource?: boolean;
  fillTarget?: boolean;
  contentDisplayMode?: ExcelContentDisplayMode;
}): ExcelCellUiState {
  const {
    cell,
    selected = false,
    editing = false,
    pending = false,
    saved = false,
    error,
    canCommit = false,
    fillSource = false,
    fillTarget = false,
    contentDisplayMode = 'previewText',
  } = params;
  const editable = canInlineEditExcelCell(cell, canCommit);
  const descriptor = getExcelEditorDescriptor(cell.policy.editorKind);
  const isContentCell = cell.canonicalField === 'content';
  const contentText = typeof cell.value === 'string' ? cell.value : '';
  const showFullMarkdownContent = isContentCell && contentDisplayMode === 'fullMarkdown' && !!contentText.trim();
  const title = buildExcelCellTitle({ error, editable, policyReason: cell.policy.reason });
  return {
    editable,
    readonly: !editable,
    descriptor,
    editorOptions: getExcelEditorOptions(cell),
    cellKey: getExcelCellKey(cell.itemId, cell.canonicalField),
    isContentCell,
    contentText,
    showFullMarkdownContent,
    title,
    className: buildExcelCellClassName({
      editable,
      policyEditable: cell.policy.editable,
      dangerLevel: cell.policy.dangerLevel,
      isContentCell,
      showFullMarkdownContent,
      selected,
      editing,
      pending,
      saved,
      error,
      fillSource,
      fillTarget,
    }),
    saveState: getExcelCellSaveState({ pending, saved, error }),
  };
}

export function resolveExcelCellEditorKeyAction(params: {
  key: string;
  shiftKey?: boolean;
  descriptorTag: ExcelEditorDescriptor['tag'];
}): ExcelCellEditorKeyAction {
  if (params.key === 'Escape') return 'cancel-edit';
  if (params.key === 'Enter' && !(params.descriptorTag === 'textarea' && params.shiftKey)) return 'commit-edit';
  return 'none';
}

export function resolveExcelCellKeyAction(params: {
  key: string;
  shiftKey?: boolean;
  editing: boolean;
  editable: boolean;
  fillDragging: boolean;
}): ExcelCellKeyAction {
  const { key, shiftKey, editing, editable, fillDragging } = params;
  if (key === 'Escape' && fillDragging) return { type: 'cancel-fill-drag' };
  if (editing) return { type: 'none' };
  if (key === 'ArrowUp') return { type: 'navigate', direction: 'up' };
  if (key === 'ArrowDown') return { type: 'navigate', direction: 'down' };
  if (key === 'ArrowLeft') return { type: 'navigate', direction: 'left' };
  if (key === 'ArrowRight') return { type: 'navigate', direction: 'right' };
  if (key === 'Tab') return { type: 'navigate', direction: shiftKey ? 'previous' : 'next' };
  if ((key === 'Enter' || key === 'F2') && editable) return { type: 'start-edit' };
  return { type: 'none' };
}
