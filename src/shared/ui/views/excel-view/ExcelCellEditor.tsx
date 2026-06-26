/** @jsxImportSource preact */
import { h } from 'preact';
import { getExcelTypedInputProps } from './ExcelCellModel';
import type { ExcelEditorDescriptor, ExcelEditorOption } from './types';

export interface ExcelCellEditorProps {
  descriptor: ExcelEditorDescriptor;
  editorOptions: ExcelEditorOption[];
  editorKind: string;
  draft: string;
  pending: boolean;
  inputRef: any;
  onDraftChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent) => void;
  onBlur: () => void;
}

export function ExcelCellEditor({
  descriptor,
  editorOptions,
  editorKind,
  draft,
  pending,
  inputRef,
  onDraftChange,
  onKeyDown,
  onBlur,
}: ExcelCellEditorProps) {
  return (
    <span class="excel-view-cell-edit-wrap">
      {descriptor.tag === 'textarea' ? (
        <textarea
          ref={inputRef as any}
          class="excel-view-cell-editor excel-view-cell-editor-textarea"
          value={draft}
          disabled={pending}
          onInput={(event: any) => onDraftChange(event.currentTarget.value)}
          onKeyDown={onKeyDown as any}
          onBlur={onBlur}
        />
      ) : descriptor.tag === 'select' ? (
        <select
          ref={inputRef as any}
          class="excel-view-cell-editor excel-view-cell-editor-select"
          value={draft}
          disabled={pending}
          onChange={(event: any) => onDraftChange(event.currentTarget.value)}
          onKeyDown={onKeyDown as any}
          onBlur={onBlur}
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
          {...getExcelTypedInputProps(editorKind)}
          onInput={(event: any) => onDraftChange(event.currentTarget.value)}
          onKeyDown={onKeyDown as any}
          onBlur={onBlur}
        />
      )}
      <span class="excel-view-cell-edit-hint">{descriptor.hint}</span>
    </span>
  );
}
