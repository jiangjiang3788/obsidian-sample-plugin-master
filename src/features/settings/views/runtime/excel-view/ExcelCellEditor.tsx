/** @jsxImportSource preact */
import { h, type Ref } from 'preact';
import { getExcelTypedInputProps } from './ExcelCellModel';
import type { ExcelEditorDescriptor, ExcelEditorOption } from './types';

export interface ExcelCellEditorProps {
  descriptor: ExcelEditorDescriptor;
  editorOptions: ExcelEditorOption[];
  editorKind: string;
  draft: string;
  pending: boolean;
  inputRef: Ref<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
  onDraftChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent) => void;
  onBlur: () => void;
}

function readEditorValue(event: Event): string {
  const target = event.currentTarget as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
  return target?.value ?? '';
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
          ref={inputRef as Ref<HTMLTextAreaElement>}
          class="excel-view-cell-editor excel-view-cell-editor-textarea"
          value={draft}
          disabled={pending}
          onInput={(event: Event) => onDraftChange(readEditorValue(event))}
          onKeyDown={(event: KeyboardEvent) => onKeyDown(event)}
          onBlur={onBlur}
        />
      ) : descriptor.tag === 'select' ? (
        <select
          ref={inputRef as Ref<HTMLSelectElement>}
          class="excel-view-cell-editor excel-view-cell-editor-select"
          value={draft}
          disabled={pending}
          onChange={(event: Event) => onDraftChange(readEditorValue(event))}
          onKeyDown={(event: KeyboardEvent) => onKeyDown(event)}
          onBlur={onBlur}
        >
          {editorOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : (
        <input
          ref={inputRef as Ref<HTMLInputElement>}
          class="excel-view-cell-editor"
          type={descriptor.type || 'text'}
          value={draft}
          disabled={pending}
          {...getExcelTypedInputProps(editorKind)}
          onInput={(event: Event) => onDraftChange(readEditorValue(event))}
          onKeyDown={(event: KeyboardEvent) => onKeyDown(event)}
          onBlur={onBlur}
        />
      )}
      <span class="excel-view-cell-edit-hint">{descriptor.hint}</span>
    </span>
  );
}
