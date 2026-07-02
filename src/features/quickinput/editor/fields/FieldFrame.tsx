/** @jsxImportSource preact */
import { h, type ComponentChildren } from 'preact';

interface QuickInputFieldFrameProps {
  label: string;
  required?: boolean;
  textarea?: boolean;
  inline?: boolean;
  children: ComponentChildren;
}

function QuickInputFieldLabel({ label, required = false }: { label: string; required?: boolean }) {
  return (
    <span className="think-qif-label">
      {label}{required ? <span className="think-qif-label__required">*</span> : null}
    </span>
  );
}

export function QuickInputFieldFrame({
  label,
  required = false,
  textarea = false,
  inline = false,
  children,
}: QuickInputFieldFrameProps) {
  if (inline) {
    return (
      <div className="think-form-row think-form-row--inline think-qif-frame think-qif-frame--inline">
        <div className="think-qif-frame__inline-label">
          <QuickInputFieldLabel label={label} required={required} />
        </div>
        <div className="think-qif-frame__inline-control">{children}</div>
      </div>
    );
  }

  return (
    <div className={textarea ? 'think-form-row think-textarea-row think-qif-frame' : 'think-form-row think-qif-frame'}>
      <QuickInputFieldLabel label={label} required={required} />
      {children}
    </div>
  );
}
