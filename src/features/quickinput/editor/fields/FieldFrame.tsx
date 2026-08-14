/** @jsxImportSource preact */
import { h, type ComponentChildren } from 'preact';

import { QuickInputFormRow } from '../components/FormRow';

interface QuickInputFieldFrameProps {
  label: string;
  required?: boolean;
  textarea?: boolean;
  inline?: boolean;
  children: ComponentChildren;
}

export function QuickInputFieldFrame({
  label,
  required = false,
  textarea = false,
  inline = false,
  children,
}: QuickInputFieldFrameProps) {
  return (
    <QuickInputFormRow
      label={label}
      required={required}
      className={[
        'think-form-row',
        'think-qif-frame',
        textarea ? 'think-textarea-row' : '',
        inline ? 'think-qif-frame--inline' : '',
      ].filter(Boolean).join(' ')}
    >
      {children}
    </QuickInputFormRow>
  );
}
