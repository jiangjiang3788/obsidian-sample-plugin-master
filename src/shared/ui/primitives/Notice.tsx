/** @jsxImportSource preact */
import type { ComponentChildren } from 'preact';

export interface ThinkNoticeProps {
  children: ComponentChildren;
  tone?: 'info' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function ThinkNotice({ children, tone = 'info', className }: ThinkNoticeProps) {
  return (
    <div className={['think-notice', `think-notice--${tone}`, className].filter(Boolean).join(' ')} role={tone === 'danger' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
