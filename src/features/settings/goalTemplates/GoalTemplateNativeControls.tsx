/** @jsxImportSource preact */
import { h } from 'preact';
import type { JSX } from 'preact';

function readInputValue(event: Event): string {
  return ((event.target || event.currentTarget) as HTMLInputElement | HTMLTextAreaElement).value;
}

function stopEditorEvent(event: Event) {
  event.stopPropagation();
}

const nativeControlBaseStyle: JSX.CSSProperties = {
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  border: '1px solid var(--background-modifier-border)',
  borderRadius: 6,
  background: 'var(--background-primary)',
  color: 'var(--text-normal)',
  padding: '8px 10px',
  font: 'inherit',
  lineHeight: 1.4,
  userSelect: 'text',
  WebkitUserSelect: 'text',
  pointerEvents: 'auto',
};

const nativeLabelStyle: JSX.CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
};

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
    <label style={{ display: 'block', minWidth: 0 }}>
      <span style={nativeLabelStyle}>{label}</span>
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onMouseDown={stopEditorEvent}
        onClick={stopEditorEvent}
        onDblClick={stopEditorEvent}
        onKeyDown={stopEditorEvent}
        onKeyUp={stopEditorEvent}
        onInput={(event) => onInput(readInputValue(event))}
        style={{ ...nativeControlBaseStyle, opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'text' }}
      />
    </label>
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
    <label style={{ display: 'block', minWidth: 0 }}>
      <span style={nativeLabelStyle}>{label}</span>
      <select
        value={value}
        disabled={disabled}
        onMouseDown={stopEditorEvent}
        onClick={stopEditorEvent}
        onDblClick={stopEditorEvent}
        onKeyDown={stopEditorEvent}
        onKeyUp={stopEditorEvent}
        onChange={(event) => onChange(((event.target || event.currentTarget) as HTMLSelectElement).value)}
        style={{ ...nativeControlBaseStyle, opacity: disabled ? 0.6 : 1 }}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
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
  return (
    <label style={{ display: 'block', minWidth: 0 }}>
      {label ? <span style={nativeLabelStyle}>{label}</span> : null}
      <textarea
        value={value}
        disabled={disabled}
        rows={rows}
        onMouseDown={stopEditorEvent}
        onClick={stopEditorEvent}
        onDblClick={stopEditorEvent}
        onKeyDown={stopEditorEvent}
        onKeyUp={stopEditorEvent}
        onInput={(event) => onInput(readInputValue(event))}
        style={{
          ...nativeControlBaseStyle,
          fontFamily: 'monospace',
          fontSize: '13px',
          resize: 'vertical',
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />
    </label>
  );
}
