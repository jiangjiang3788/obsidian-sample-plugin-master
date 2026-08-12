/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ExcelCellContent } from './ExcelCellContent';
import { ExcelCellEditor } from './ExcelCellEditor';
import {
  buildExcelCellUiState,
  isExcelMarkdownInteractiveTarget,
  readExcelKeyboardValue,
  resolveExcelCellEditorKeyAction,
  resolveExcelCellKeyAction,
} from './ExcelCellModel';
import type { ExcelCellProps } from './types';
import { hasPlatformModifier } from '@shared/ui/public';

export function ExcelCell({
  cell,
  selected = false,
  editing = false,
  pending = false,
  saved = false,
  error,
  canCommit = false,
  style,
  fillDragging = false,
  fillSource = false,
  fillTarget = false,
  contentDisplayMode = 'previewText',
  messageRenderPort,
  onSelect,
  onStartEdit,
  onCancelEdit,
  onCommitEdit,
  onNavigate,
  onPasteText,
  onStartFillDrag,
  onMoveFillDrag,
  onFinishFillDrag,
  onCancelFillDrag,
  onOpenRecordOrigin,
}: ExcelCellProps) {
  const { item, field, editorValue, policy } = cell;
  const [draft, setDraft] = useState(editorValue);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);
  const ui = buildExcelCellUiState({ cell, selected, editing, pending, saved, error, canCommit, fillSource, fillTarget, contentDisplayMode });

  useEffect(() => {
    if (editing) setDraft(editorValue);
  }, [editing, editorValue]);

  useEffect(() => {
    if (!editing) return;
    const input = inputRef.current;
    input?.focus?.();
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) input.select();
  }, [editing]);

  const commit = (nextValue: string = draft) => {
    if (!editing || pending) return;
    onCommitEdit?.(cell, nextValue);
  };

  const handleCellClick = (event: MouseEvent) => {
    if (fillDragging) return;
    if (hasPlatformModifier(event)) {
      event.preventDefault();
      event.stopPropagation();
      return onOpenRecordOrigin?.(item);
    }
    onSelect?.(cell);
  };

  const handleDoubleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (ui.editable) onStartEdit?.(cell);
    else onSelect?.(cell);
  };

  const handleMarkdownClick = (event: MouseEvent) => {
    if (isExcelMarkdownInteractiveTarget(event.target)) event.stopPropagation();
  };

  const handleMarkdownDoubleClick = (event: MouseEvent) => {
    if (isExcelMarkdownInteractiveTarget(event.target)) event.stopPropagation();
  };

  const handleFillMouseDown = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!ui.editable || pending || editing) return;
    onStartFillDrag?.(cell);
  };

  const handleEditorKeyDown = (event: KeyboardEvent) => {
    const action = resolveExcelCellEditorKeyAction({ key: event.key, shiftKey: event.shiftKey, descriptorTag: ui.descriptor.tag });
    if (action === 'none') return;
    event.preventDefault();
    if (action === 'cancel-edit') return onCancelEdit?.();
    commit(readExcelKeyboardValue(event));
  };

  const handleCellKeyDown = (event: KeyboardEvent) => {
    const action = resolveExcelCellKeyAction({ key: event.key, shiftKey: event.shiftKey, editing, editable: ui.editable, fillDragging });
    if (action.type === 'none') return;
    event.preventDefault();
    event.stopPropagation();
    if (action.type === 'cancel-fill-drag') return onCancelFillDrag?.();
    if (action.type === 'start-edit') return onStartEdit?.(cell);
    onNavigate?.(cell, action.direction);
  };

  const handlePaste = (event: ClipboardEvent) => {
    if (editing) return;
    const text = event.clipboardData?.getData('text/plain') || '';
    if (!text) return;
    event.preventDefault();
    event.stopPropagation();
    onPasteText?.(cell, text);
  };

  return (
    <td
      data-excel-cell-key={ui.cellKey}
      data-field={field}
      data-canonical-field={policy.canonicalField}
      data-editable={ui.editable ? 'true' : 'false'}
      data-policy-editable={policy.editable ? 'true' : 'false'}
      data-editor-kind={policy.editorKind}
      data-danger-level={policy.dangerLevel}
      data-content-display-mode={ui.isContentCell ? contentDisplayMode : undefined}
      data-save-state={ui.saveState}
      class={ui.className}
      style={style}
      title={onOpenRecordOrigin ? `${ui.title} · Ctrl/⌘+点击打开原文` : ui.title}
      tabIndex={0}
      aria-readonly={ui.readonly ? 'true' : 'false'}
      aria-invalid={error ? 'true' : 'false'}
      onClick={handleCellClick as any}
      onDblClick={handleDoubleClick as any}
      onMouseEnter={() => fillDragging && onMoveFillDrag?.(cell)}
      onMouseUp={() => fillDragging && onFinishFillDrag?.(cell)}
      onKeyDown={handleCellKeyDown as any}
      onPaste={handlePaste as any}
    >
      {editing ? (
        <ExcelCellEditor
          descriptor={ui.descriptor}
          editorOptions={ui.editorOptions}
          editorKind={policy.editorKind}
          draft={draft}
          pending={pending}
          inputRef={inputRef}
          onDraftChange={setDraft}
          onKeyDown={handleEditorKeyDown}
          onBlur={() => commit()}
        />
      ) : (
        <ExcelCellContent
          cell={cell}
          contentText={ui.contentText}
          showFullMarkdownContent={ui.showFullMarkdownContent}
          messageRenderPort={messageRenderPort}
          onMarkdownClick={handleMarkdownClick}
          onMarkdownDoubleClick={handleMarkdownDoubleClick}
        />
      )}
      {!editing && selected ? <span class="excel-view-cell-affordance" aria-hidden="true">{ui.editable ? '✎' : '🔒'}</span> : null}
      {selected && ui.editable && !editing && !pending ? (
        <span class="excel-view-fill-handle" aria-label="拖动覆盖同列" title="拖动覆盖同列单元格" onMouseDown={handleFillMouseDown as any} />
      ) : null}
      {pending ? <span class="excel-view-cell-status" aria-label="保存中">…</span> : null}
      {saved && !pending && !error ? <span class="excel-view-cell-status is-saved" aria-label="已保存">✓</span> : null}
      {error ? <span class="excel-view-cell-error" aria-label={error}>!</span> : null}
    </td>
  );
}
