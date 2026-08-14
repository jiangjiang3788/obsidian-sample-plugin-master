/** @jsxImportSource preact */
import { h, type ComponentChildren } from 'preact';

export interface QuickInputFormRowProps {
  label: string;
  required?: boolean;
  children: ComponentChildren;
  className?: string;
}

export function QuickInputFormLabel({ label, required = false }: { label: string; required?: boolean }) {
  return (
    <span className="think-qif-label">
      {label}{required ? <span className="think-qif-label__required">*</span> : null}
    </span>
  );
}

/**
 * QuickInput 统一左右表单行。
 * 目标等上下文字段与模板字段都必须复用这一结构，避免出现两套布局语义。
 */
export function QuickInputFormRow({ label, required = false, children, className = '' }: QuickInputFormRowProps) {
  return (
    <div className={['think-qif-row', className].filter(Boolean).join(' ')}>
      <div className="think-qif-row__label">
        <QuickInputFormLabel label={label} required={required} />
      </div>
      <div className="think-qif-row__control">{children}</div>
    </div>
  );
}
