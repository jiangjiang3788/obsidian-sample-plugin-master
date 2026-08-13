/** @jsxImportSource preact */
import type { ComponentChildren, JSX } from 'preact';
import { ThinkIcon } from './Icon';

export interface ThinkDisclosureProps extends Omit<JSX.HTMLAttributes<HTMLDetailsElement>, 'title'> {
  title: ComponentChildren;
  meta?: ComponentChildren;
  children: ComponentChildren;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ThinkDisclosure({ title, meta, children, open, onOpenChange, className, ...props }: ThinkDisclosureProps) {
  return (
    <details
      {...props}
      className={['think-disclosure', className].filter(Boolean).join(' ')}
      open={open}
      onToggle={(event) => onOpenChange?.((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="think-disclosure__summary">
        <span className="think-disclosure__title">{title}</span>
        {meta ? <span className="think-disclosure__meta">{meta}</span> : null}
        <ThinkIcon name="chevron-down" className="think-disclosure__icon" />
      </summary>
      <div className="think-disclosure__body">{children}</div>
    </details>
  );
}
