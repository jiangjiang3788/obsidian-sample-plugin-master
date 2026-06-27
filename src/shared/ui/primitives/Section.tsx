/** @jsxImportSource preact */
import type { ComponentChildren, JSX } from 'preact';

export interface ThinkSectionProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'title'> {
  title: ComponentChildren;
  description?: ComponentChildren;
  actions?: ComponentChildren;
  children?: ComponentChildren;
}

export function ThinkSection({ title, description, actions, children, className, ...props }: ThinkSectionProps) {
  return (
    <section {...props} className={['think-section', className].filter(Boolean).join(' ')}>
      <header className="think-section__header">
        <div>
          <h2 className="think-section__title">{title}</h2>
          {description ? <p className="think-section__description">{description}</p> : null}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}
