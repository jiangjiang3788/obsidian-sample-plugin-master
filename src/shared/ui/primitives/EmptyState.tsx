/** @jsxImportSource preact */
import type { ComponentChildren } from 'preact';

export interface ThinkEmptyStateProps {
  icon?: ComponentChildren;
  title: ComponentChildren;
  description?: ComponentChildren;
  action?: ComponentChildren;
  className?: string;
}

export function ThinkEmptyState({ icon, title, description, action, className }: ThinkEmptyStateProps) {
  return (
    <div className={['think-empty-state', className].filter(Boolean).join(' ')}>
      {icon ? <div className="think-empty-state__icon" aria-hidden="true">{icon}</div> : null}
      <h3 className="think-empty-state__title">{title}</h3>
      {description ? <p className="think-empty-state__description">{description}</p> : null}
      {action}
    </div>
  );
}
