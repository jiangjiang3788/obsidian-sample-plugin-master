/** @jsxImportSource preact */
import type { JSX } from 'preact';

export type ThinkRangeProps = Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function ThinkRange({ className, ...props }: ThinkRangeProps) {
  return <input {...props} type="range" className={['think-range', className].filter(Boolean).join(' ')} />;
}
