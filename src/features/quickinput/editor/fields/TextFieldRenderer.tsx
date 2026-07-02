/** @jsxImportSource preact */
import { h } from 'preact';

import { isTemplateMultiValueField } from '@core/fields/public';

import { QuickInputFieldFrame } from './FieldFrame';
import { isQuickInputInlineRowField, isQuickInputTimeField } from './fieldSemantics';
import type { QuickInputFieldRendererBaseProps } from './types';
import { readInputValue, setTextareaAutoHeight, shouldSubmitPlainEnter, shouldSubmitShortcutEnter } from './inputEvents';

export function QuickInputTextAreaValueFieldRenderer({
  field,
  value,
  dense,
  onUpdate,
  onRequestSubmit,
  isMobileLike,
}: QuickInputFieldRendererBaseProps) {
  const multiline = isTemplateMultiValueField(field);
  const displayValue = Array.isArray(value) ? value.join('\n') : String(value ?? '');
  const minHeight = dense ? 78 : 96;
  return (
    <QuickInputFieldFrame label={field.label || field.key} required={field.required} textarea>
      <textarea
        className={dense ? 'think-native-input think-native-input--textarea think-qif-textarea think-qif-textarea--short is-dense' : 'think-native-input think-native-input--textarea think-qif-textarea think-qif-textarea--short'}
        value={displayValue}
        rows={dense ? 3 : 4}
        onInput={(event) => {
          onUpdate(field.key, readInputValue(event));
          setTextareaAutoHeight(event.currentTarget as HTMLTextAreaElement, minHeight);
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (shouldSubmitShortcutEnter(event, isMobileLike)) {
            onRequestSubmit?.();
            event.preventDefault();
          }
        }}
        placeholder={multiline ? '每行一个，或用逗号分隔' : undefined}
        ref={(el: HTMLTextAreaElement | null) => setTextareaAutoHeight(el, minHeight)}
      />
    </QuickInputFieldFrame>
  );
}

export function QuickInputNativeFieldRenderer({
  field,
  value,
  dense,
  isMobileLike,
  onUpdate,
  onRequestSubmit,
}: QuickInputFieldRendererBaseProps) {
  const inputType = field.type === 'textarea' ? 'textarea' : field.type || 'text';
  const minHeight = dense ? 96 : 118;
  const commonProps = {
    className: inputType === 'textarea' ? (dense ? 'think-native-input think-native-input--textarea think-qif-textarea is-dense' : 'think-native-input think-native-input--textarea think-qif-textarea') : 'think-native-input',
    value: String(value || ''),
    onInput: (event: Event) => {
      onUpdate(field.key, readInputValue(event));
      if (inputType === 'textarea') setTextareaAutoHeight(event.currentTarget as HTMLTextAreaElement, minHeight);
    },
    onKeyDown: (event: KeyboardEvent) => {
      event.stopPropagation();
      if (inputType === 'textarea') {
        if (shouldSubmitShortcutEnter(event, isMobileLike)) {
          onRequestSubmit?.();
          event.preventDefault();
        }
        return;
      }
      if (shouldSubmitPlainEnter(event, isMobileLike)) {
        onRequestSubmit?.();
        event.preventDefault();
      }
    },
  };

  const control = inputType === 'textarea' ? (
    <textarea
      {...commonProps}
      rows={dense ? 4 : 5}
      enterKeyHint={isMobileLike ? 'enter' : 'done'}
      ref={(el: HTMLTextAreaElement | null) => setTextareaAutoHeight(el, minHeight)}
    />
  ) : (
    <input
      {...commonProps}
      type={inputType === 'text' ? 'text' : inputType}
      min={field.min}
      max={field.max}
      enterKeyHint={isMobileLike ? 'enter' : 'done'}
      className={isQuickInputTimeField(field) ? `${commonProps.className} think-qif-time-input` : commonProps.className}
    />
  );

  return (
    <QuickInputFieldFrame
      label={field.label || field.key}
      required={field.required}
      textarea={inputType === 'textarea'}
      inline={isQuickInputInlineRowField(field)}
    >
      {control}
    </QuickInputFieldFrame>
  );
}
