/** @jsxImportSource preact */
import { h } from 'preact';
import { ThinkInput, ThinkSelect, ThinkTextarea } from '@shared/ui/public';

function readInputValue(event: Event): string {
  return ((event.target || event.currentTarget) as HTMLInputElement | HTMLTextAreaElement).value;
}

function stopEditorEvent(event: Event) {
  event.stopPropagation();
}

function ControlRow({ label, children, top = false }: { label?: string; children: h.JSX.Element; top?: boolean }) {
  if (!label) return children;
  return (
    <div className={`think-settings-row${top ? ' think-settings-row--top' : ''}`}>
      <div className="think-settings-row__label">{label}</div>
      <div className="think-settings-row__body">{children}</div>
    </div>
  );
}

export function NativeTextInput({
  label,
  value,
  onInput,
  disabled = false,
  placeholder,
}: {
  label: string;
  value: string;
  onInput: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <ControlRow label={label}>
      <ThinkInput
        className="think-settings-full-width"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onMouseDown={stopEditorEvent}
        onClick={stopEditorEvent}
        onDblClick={stopEditorEvent}
        onKeyDown={stopEditorEvent}
        onKeyUp={stopEditorEvent}
        onInput={(event) => onInput(readInputValue(event))}
      />
    </ControlRow>
  );
}

export function NativeSelectInput({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <ControlRow label={label}>
      <ThinkSelect
        className="think-settings-full-width"
        value={value}
        disabled={disabled}
        onMouseDown={stopEditorEvent}
        onClick={stopEditorEvent}
        onDblClick={stopEditorEvent}
        onKeyDown={stopEditorEvent}
        onKeyUp={stopEditorEvent}
        onChange={(event) => onChange(((event.target || event.currentTarget) as HTMLSelectElement).value)}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </ThinkSelect>
    </ControlRow>
  );
}

export function NativeTextarea({
  label,
  value,
  onInput,
  disabled = false,
  rows = 8,
}: {
  label?: string;
  value: string;
  onInput: (value: string) => void;
  disabled?: boolean;
  rows?: number;
}) {
  const control = (
    <ThinkTextarea
      className="think-settings-full-width think-goal-template-editor__textarea"
      value={value}
      disabled={disabled}
      rows={rows}
      onMouseDown={stopEditorEvent}
      onClick={stopEditorEvent}
      onDblClick={stopEditorEvent}
      onKeyDown={stopEditorEvent}
      onKeyUp={stopEditorEvent}
      onInput={(event) => onInput(readInputValue(event))}
    />
  );
  return <ControlRow label={label} top>{control}</ControlRow>;
}
