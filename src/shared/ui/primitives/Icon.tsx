/** @jsxImportSource preact */
import type { JSX } from 'preact';

export type ThinkIconName =
  | 'arrow-up'
  | 'calendar'
  | 'copy'
  | 'check'
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-left'
  | 'chevron-right'
  | 'file-plus'
  | 'filter'
  | 'grip-vertical'
  | 'lock'
  | 'pencil'
  | 'plus'
  | 'rotate-ccw'
  | 'settings'
  | 'trash-2'
  | 'unlock'
  | 'upload';

export interface ThinkIconProps extends Omit<JSX.SVGAttributes<SVGSVGElement>, 'children'> {
  name: ThinkIconName;
}

function renderIcon(name: ThinkIconName) {
  switch (name) {
    case 'chevron-left':
      return <path d="m15 18-6-6 6-6" />;
    case 'chevron-right':
      return <path d="m9 18 6-6-6-6" />;
    case 'chevron-down':
      return <path d="m6 9 6 6 6-6" />;
    case 'chevron-up':
      return <path d="m18 15-6-6-6 6" />;
    case 'copy':
      return <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>;
    case 'calendar':
      return <><path d="M8 2v4M16 2v4M3 10h18" /><rect x="3" y="4" width="18" height="18" rx="2" /></>;
    case 'filter':
      return <path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3Z" />;
    case 'grip-vertical':
      return <><circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" /></>;
    case 'arrow-up':
      return <><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></>;
    case 'lock':
      return <><rect x="4" y="10" width="16" height="12" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>;
    case 'unlock':
      return <><rect x="4" y="10" width="16" height="12" rx="2" /><path d="M8 10V7a4 4 0 0 1 7.6-1.8" /></>;
    case 'trash-2':
      return <><path d="M3 6h18M8 6V4h8v2M19 6l-1 16H6L5 6M10 11v6M14 11v6" /></>;
    case 'upload':
      return <><path d="M12 16V3M7 8l5-5 5 5" /><path d="M5 21h14a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2" /></>;
    case 'plus':
      return <path d="M12 5v14M5 12h14" />;
    case 'check':
      return <path d="m5 12 4 4L19 6" />;
    case 'pencil':
      return <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>;
    case 'rotate-ccw':
      return <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>;
    case 'file-plus':
      return <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M12 11v6M9 14h6" /></>;
    case 'settings':
      return <><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5" /><circle cx="16" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="13" cy="18" r="2" /></>;
    default:
      return null;
  }
}

/** Lucide-style icon primitive that stays inside the shared UI boundary. */
export function ThinkIcon({ name, className, ...svgProps }: ThinkIconProps) {
  return (
    <svg
      {...svgProps}
      className={['think-lucide-icon', className].filter(Boolean).join(' ')}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {renderIcon(name)}
    </svg>
  );
}
