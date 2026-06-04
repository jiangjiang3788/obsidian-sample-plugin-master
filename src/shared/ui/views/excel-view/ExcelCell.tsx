/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { MarkdownContent } from '../../markdown/MarkdownContent';
import { getExcelEditorOptions, truncateExcelCellText } from './value';
import { canInlineEditExcelCell, getExcelEditorDescriptor, getExcelCellKey } from './types';
import type { ExcelCellProps, ExcelNavigationDirection } from './types';

function readKeyboardValue(event: KeyboardEvent): string {
  const target = event.currentTarget as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  return target.value;
}

function getReadonlyTitle(policyReason?: string): string {
  return policyReason || '该字段不可在 Excel 单元格中直接编辑';
}

function getTypedInputProps(kind: string): Record<string, string | number> {
  if (kind === 'number') return { step: 'any' };
  if (kind === 'rating') return { step: 1, min: 0, max: 5 };
  return {};
}

function isMarkdownInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest('a, button, input, textarea, select, .internal-link, .external-link, .tag');
}

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
  onOpenRecord,
}: ExcelCellProps) {
  const { item, field, value, displayValue, editorValue, policy } = cell;
  const [draft, setDraft] = useState(editorValue);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);
  const editable = canInlineEditExcelCell(cell, canCommit);
  const readonly = !editable;
  const descriptor = getExcelEditorDescriptor(policy.editorKind);
  const editorOptions = getExcelEditorOptions(cell);
  const cellKey = getExcelCellKey(cell.itemId, cell.canonicalField);
  const isContentCell = cell.canonicalField === 'content';
  const contentText = typeof value === 'string' ? value : '';
  const showFullMarkdownContent = isContentCell && contentDisplayMode === 'fullMarkdown' && !!contentText.trim();

  useEffect(() => {
    if (editing) setDraft(editorValue);
  }, [editing, editorValue]);

  useEffect(() => {
    if (!editing) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select?.();
  }, [editing]);

  const commit = (nextValue: string = draft) => {
    if (!editing || pending) return;
    onCommitEdit?.(cell, nextValue);
  };

  const handleCellClick = (event: MouseEvent) => {
    if (fillDragging) return;
    if (event.metaKey || event.ctrlKey) {
      onOpenRecord?.(item);
      return;
    }
    onSelect?.(cell);
  };

  const handleDoubleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (editable) onStartEdit?.(cell);
    else onSelect?.(cell);
  };

  const handleMarkdownClick = (event: MouseEvent) => {
    if (isMarkdownInteractiveTarget(event.target)) event.stopPropagation();
  };

  const handleMarkdownDoubleClick = (event: MouseEvent) => {
    if (isMarkdownInteractiveTarget(event.target)) event.stopPropagation();
  };

  const handleFillMouseDown = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!editable || pending || editing) return;
    onStartFillDrag?.(cell);
  };

  const handleMouseEnter = () => {
    if (fillDragging) onMoveFillDrag?.(cell);
  };

  const handleMouseUp = () => {
    if (fillDragging) onFinishFillDrag?.(cell);
  };

  const navigate = (event: KeyboardEvent, direction: ExcelNavigationDirection) => {
    event.preventDefault();
    event.stopPropagation();
    onNavigate?.(cell, direction);
  };

  const handleEditorKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancelEdit?.();
      return;
    }
    if (event.key === 'Enter' && !(descriptor.tag === 'textarea' && event.shiftKey)) {
      event.preventDefault();
      commit(readKeyboardValue(event));
    }
  };

  const handleCellKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && fillDragging) {
      event.preventDefault();
      onCancelFillDrag?.();
      return;
    }

    if (editing) return;

    if (event.key === 'ArrowUp') return navigate(event, 'up');
    if (event.key === 'ArrowDown') return navigate(event, 'down');
    if (event.key === 'ArrowLeft') return navigate(event, 'left');
    if (event.key === 'ArrowRight') return navigate(event, 'right');
    if (event.key === 'Tab') return navigate(event, event.shiftKey ? 'previous' : 'next');

    if ((event.key === 'Enter' || event.key === 'F2') && editable) {
      event.preventDefault();
      onStartEdit?.(cell);
      return;
    }
  };

  const handlePaste = (event: ClipboardEvent) => {
    if (editing) return;
    const text = event.clipboardData?.getData('text/plain') || '';
    if (!text) return;
    event.preventDefault();
    event.stopPropagation();
    onPasteText?.(cell, text);
  };

  const title = error
    || (editable
      ? '双击/F2/Enter 编辑；方向键/Tab 移动；可粘贴多行多列；拖动右下角小方块可向同列覆盖；Ctrl/⌘ 点击打开完整编辑'
      : `${getReadonlyTitle(policy.reason)}；Ctrl/⌘ 点击可打开完整编辑`);

  const className = [
    'excel-view-cell',
    editable ? 'is-inline-editable' : 'is-readonly',
    policy.editable ? 'is-policy-editable' : 'is-policy-readonly',
    policy.dangerLevel === 'medium' ? 'is-medium-risk' : '',
    policy.dangerLevel === 'high' ? 'is-high-risk' : '',
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

  return (
    <td
      data-excel-cell-key={cellKey}
      data-field={field}
      data-canonical-field={policy.canonicalField}
      data-editable={editable ? 'true' : 'false'}
      data-policy-editable={policy.editable ? 'true' : 'false'}
      data-editor-kind={policy.editorKind}
      data-danger-level={policy.dangerLevel}
      data-content-display-mode={isContentCell ? contentDisplayMode : undefined}
      data-save-state={pending ? 'pending' : error ? 'error' : saved ? 'saved' : 'idle'}
      class={className}
      style={style}
      title={title}
      tabIndex={0}
      aria-readonly={readonly ? 'true' : 'false'}
      aria-invalid={error ? 'true' : 'false'}
      onClick={handleCellClick as any}
      onDblClick={handleDoubleClick as any}
      onMouseEnter={handleMouseEnter as any}
      onMouseUp={handleMouseUp as any}
      onKeyDown={handleCellKeyDown as any}
      onPaste={handlePaste as any}
    >
      {editing ? (
        <span class="excel-view-cell-edit-wrap">
          {descriptor.tag === 'textarea' ? (
            <textarea
              ref={inputRef as any}
              class="excel-view-cell-editor excel-view-cell-editor-textarea"
              value={draft}
              disabled={pending}
              onInput={(event: any) => setDraft(event.currentTarget.value)}
              onKeyDown={handleEditorKeyDown as any}
              onBlur={() => commit()}
            />
          ) : descriptor.tag === 'select' ? (
            <select
              ref={inputRef as any}
              class="excel-view-cell-editor excel-view-cell-editor-select"
              value={draft}
              disabled={pending}
              onChange={(event: any) => setDraft(event.currentTarget.value)}
              onKeyDown={handleEditorKeyDown as any}
              onBlur={() => commit()}
            >
              {editorOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          ) : (
            <input
              ref={inputRef as any}
              class="excel-view-cell-editor"
              type={descriptor.type || 'text'}
              value={draft}
              disabled={pending}
              {...getTypedInputProps(policy.editorKind)}
              onInput={(event: any) => setDraft(event.currentTarget.value)}
              onKeyDown={handleEditorKeyDown as any}
              onBlur={() => commit()}
            />
          )}
          <span class="excel-view-cell-edit-hint">{descriptor.hint}</span>
        </span>
      ) : showFullMarkdownContent ? (
        <MarkdownContent
          renderPort={messageRenderPort}
          content={contentText}
          contentType="markdown"
          sourcePath={item.file?.path || ''}
          className="excel-view-cell-md"
          onClick={handleMarkdownClick}
          onDblClick={handleMarkdownDoubleClick}
        />
      ) : isContentCell && contentText ? (
        <span class="excel-view-content-link">
          {truncateExcelCellText(contentText)}
        </span>
      ) : (
        <span class="excel-view-cell-value">{displayValue}</span>
      )}
      {!editing && selected ? (
        <span class="excel-view-cell-affordance" aria-hidden="true">
          {editable ? '✎' : '🔒'}
        </span>
      ) : null}
      {selected && editable && !editing && !pending ? (
        <span
          class="excel-view-fill-handle"
          aria-label="拖动覆盖同列"
          title="拖动覆盖同列单元格"
          onMouseDown={handleFillMouseDown as any}
        />
      ) : null}
      {pending ? <span class="excel-view-cell-status" aria-label="保存中">…</span> : null}
      {saved && !pending && !error ? <span class="excel-view-cell-status is-saved" aria-label="已保存">✓</span> : null}
      {error ? <span class="excel-view-cell-error" aria-label={error}>!</span> : null}
    </td>
  );
}
