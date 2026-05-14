// src/features/settings/fieldsEditor/nativeControls.tsx
/** @jsxImportSource preact */
import type { JSX } from "preact";
import { logInputEvent } from "../../../shared/debug/inputDiagnostics";

type NativeInputEvent = Event & {
  currentTarget: HTMLInputElement | HTMLTextAreaElement;
};

function readInputValue(event: Event): string {
  return (
    (event.target || event.currentTarget) as
      | HTMLInputElement
      | HTMLTextAreaElement
  ).value;
}

function stopEditorEvent(event: Event) {
  // Obsidian 的工作区、悬浮窗和快捷键系统会监听冒泡阶段的鼠标/键盘事件。
  // 输入控件必须截断这些事件，否则会出现“能 focus，但无法选中文字/无法稳定输入”的现象。
  event.stopPropagation();
}

const nativeControlBaseStyle: JSX.CSSProperties = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "1px solid var(--background-modifier-border)",
  borderRadius: 6,
  background: "var(--background-primary)",
  color: "var(--text-normal)",
  padding: "8px 10px",
  font: "inherit",
  lineHeight: 1.4,
  userSelect: "text",
  WebkitUserSelect: "text",
  pointerEvents: "auto",
};

const nativeLabelStyle: JSX.CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontSize: "0.75rem",
  color: "var(--text-muted)",
};

export function NativeTextInput({
  label,
  value,
  onInput,
  onBlur,
  onFocus,
  disabled = false,
  placeholder,
  type = "text",
  title,
  style,
}: {
  label: string;
  value: string | number;
  onInput: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
  title?: string;
  style?: JSX.CSSProperties;
}) {
  return (
    <label style={{ display: "block", minWidth: 0, ...style }} title={title}>
      <span style={nativeLabelStyle}>{label}</span>
      <input
        type={type}
        value={value as any}
        disabled={disabled}
        placeholder={placeholder}
        data-think-diag-control={label}
        onPointerDown={(event) =>
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onPointerDown",
          })
        }
        onMouseDown={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onMouseDown before stopPropagation",
          });
          stopEditorEvent(event as any);
        }}
        onClick={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onClick before stopPropagation",
          });
          stopEditorEvent(event as any);
        }}
        onDblClick={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onDblClick before stopPropagation",
          });
          stopEditorEvent(event as any);
        }}
        onKeyDown={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onKeyDown before stopPropagation",
          });
          stopEditorEvent(event as any);
        }}
        onKeyUp={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onKeyUp before stopPropagation",
          });
          stopEditorEvent(event as any);
        }}
        onBeforeInput={(event) =>
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onBeforeInput",
          })
        }
        onInput={(event: NativeInputEvent) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onInput before local update",
            nextValue: readInputValue(event),
          });
          onInput(readInputValue(event));
        }}
        onChange={(event) =>
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onChange",
          })
        }
        onBlur={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onBlur before commit",
          });
          onBlur?.();
        }}
        onFocus={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "control onFocus",
          });
          onFocus?.();
        }}
        style={{
          ...nativeControlBaseStyle,
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? "not-allowed" : "text",
        }}
      />
    </label>
  );
}

export function NativeTextarea({
  label,
  value,
  onInput,
  onBlur,
  disabled = false,
  placeholder,
  rows = 3,
  style,
}: {
  label: string;
  value: string;
  onInput: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
  style?: JSX.CSSProperties;
}) {
  return (
    <label style={{ display: "block", minWidth: 0, ...style }}>
      <span style={nativeLabelStyle}>{label}</span>
      <textarea
        value={value}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        data-think-diag-control={label}
        onPointerDown={(event) =>
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "textarea onPointerDown",
          })
        }
        onMouseDown={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "textarea onMouseDown before stopPropagation",
          });
          stopEditorEvent(event as any);
        }}
        onClick={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "textarea onClick before stopPropagation",
          });
          stopEditorEvent(event as any);
        }}
        onDblClick={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "textarea onDblClick before stopPropagation",
          });
          stopEditorEvent(event as any);
        }}
        onKeyDown={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "textarea onKeyDown before stopPropagation",
          });
          stopEditorEvent(event as any);
        }}
        onKeyUp={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "textarea onKeyUp before stopPropagation",
          });
          stopEditorEvent(event as any);
        }}
        onBeforeInput={(event) =>
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "textarea onBeforeInput",
          })
        }
        onInput={(event: NativeInputEvent) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "textarea onInput before local update",
            nextValue: readInputValue(event),
          });
          onInput(readInputValue(event));
        }}
        onChange={(event) =>
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "textarea onChange",
          })
        }
        onBlur={(event) => {
          logInputEvent(`FieldsEditor/${label}`, event as any, {
            handler: "textarea onBlur before commit",
          });
          onBlur?.();
        }}
        style={{
          ...nativeControlBaseStyle,
          resize: "vertical",
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? "not-allowed" : "text",
        }}
      />
    </label>
  );
}
