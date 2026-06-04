import type { JSX } from 'preact';

export type ThinkOsIconProps = Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'color'> & {
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'disabled' | 'action' | string;
  fontSize?: 'inherit' | 'small' | 'medium' | 'large' | string;
  sx?: Record<string, unknown>;
  titleAccess?: string;
};

type IconStyle = JSX.CSSProperties;

const colorTokenMap: Record<string, string> = {
  inherit: 'inherit',
  primary: 'var(--interactive-accent)',
  secondary: 'var(--text-muted)',
  success: 'var(--color-green)',
  error: 'var(--color-red)',
  warning: 'var(--color-orange)',
  info: 'var(--color-blue)',
  disabled: 'var(--text-faint)',
  action: 'var(--text-muted)',
  'text.disabled': 'var(--text-faint)',
  'text.secondary': 'var(--text-muted)',
  'text.primary': 'var(--text-normal)',
  'error.main': 'var(--color-red)',
  'success.main': 'var(--color-green)',
  'warning.main': 'var(--color-orange)',
  'info.main': 'var(--color-blue)',
};

const fontSizeMap: Record<string, string> = {
  inherit: 'inherit',
  small: '1rem',
  medium: '1.25rem',
  large: '2rem',
};

function toCssSize(value: unknown): string | undefined {
  if (typeof value === 'number') return `${value}px`;
  if (typeof value === 'string') return fontSizeMap[value] ?? value;
  return undefined;
}

function toCssColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return colorTokenMap[value] ?? value;
}

function sxToStyle(sx: Record<string, unknown> | undefined): IconStyle {
  if (!sx) return {};
  const style: IconStyle = {};
  const color = toCssColor(sx.color);
  const fontSize = toCssSize(sx.fontSize);
  if (color) style.color = color;
  if (fontSize) style.fontSize = fontSize;
  if (typeof sx.transform === 'string') style.transform = sx.transform;
  if (typeof sx.transition === 'string') style.transition = sx.transition;
  if (typeof sx.opacity === 'number' || typeof sx.opacity === 'string') style.opacity = sx.opacity as IconStyle['opacity'];
  return style;
}

function makeIcon(glyph: string, defaultLabel: string) {
  return function ThinkOsIcon({
    className,
    color = 'inherit',
    fontSize = 'medium',
    style,
    sx,
    title,
    titleAccess,
    ...rest
  }: ThinkOsIconProps) {
    const mergedStyle: IconStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '1em',
      height: '1em',
      lineHeight: 1,
      flexShrink: 0,
      verticalAlign: '-0.125em',
      fontSize: toCssSize(fontSize),
      color: toCssColor(color),
      ...sxToStyle(sx),
      ...(style as IconStyle | undefined),
    };
    const label = titleAccess || title || defaultLabel;
    return (
      <span
        {...rest}
        aria-hidden={titleAccess ? undefined : true}
        aria-label={titleAccess ? label : undefined}
        className={['think-os-icon', className].filter(Boolean).join(' ')}
        role={titleAccess ? 'img' : undefined}
        style={mergedStyle}
        title={title || titleAccess}
      >
        {glyph}
      </span>
    );
  };
}

export const AddCircleOutlineIcon = makeIcon('+', 'add');
export const AddIcon = makeIcon('+', 'add');
export const ArrowBackIosNewIcon = makeIcon('‹', 'back');
export const ArrowDropDownIcon = makeIcon('⌄', 'open');
export const ArrowForwardIosIcon = makeIcon('›', 'forward');
export const CancelIcon = makeIcon('×', 'cancel');
export const ChatIcon = makeIcon('💬', 'chat');
export const CheckCircleIcon = makeIcon('✓', 'checked');
export const CheckIcon = makeIcon('✓', 'checked');
export const ChevronRightIcon = makeIcon('›', 'expand');
export const ClearIcon = makeIcon('×', 'clear');
export const CloseIcon = makeIcon('×', 'close');
export const ContentCopyIcon = makeIcon('⧉', 'copy');
export const DeleteForeverIcon = makeIcon('🗑', 'delete');
export const DeleteForeverOutlinedIcon = makeIcon('🗑', 'delete');
export const DeleteIcon = makeIcon('−', 'delete');
export const DeleteOutlineIcon = makeIcon('🗑', 'delete');
export const DownloadIcon = makeIcon('⇩', 'download');
export const DragIndicatorIcon = makeIcon('⋮⋮', 'drag');
export const EditIcon = makeIcon('✎', 'edit');
export const ErrorIcon = makeIcon('!', 'error');
export const ExpandLessIcon = makeIcon('⌃', 'collapse');
export const ExpandMoreIcon = makeIcon('⌄', 'expand');
export const FilterListIcon = makeIcon('≡', 'filter');
export const HourglassTopIcon = makeIcon('⏳', 'timer');
export const InfoIcon = makeIcon('i', 'info');
export const IosShareIcon = makeIcon('⇧', 'share');
export const PauseIcon = makeIcon('Ⅱ', 'pause');
export const PlayArrowIcon = makeIcon('▶', 'play');
export const RadioButtonUncheckedIcon = makeIcon('○', 'unchecked');
export const RefreshIcon = makeIcon('↻', 'refresh');
export const RemoveCircleOutlineIcon = makeIcon('−', 'remove');
export const RestartAltIcon = makeIcon('↺', 'reset');
export const ScannerIcon = makeIcon('▣', 'scan');
export const SearchIcon = makeIcon('⌕', 'search');
export const SendIcon = makeIcon('➤', 'send');
export const SettingsIcon = makeIcon('⚙', 'settings');
export const SmartToyIcon = makeIcon('🤖', 'ai');
export const StopIcon = makeIcon('■', 'stop');
export const TaskAltIcon = makeIcon('✓', 'done');
export const VisibilityIcon = makeIcon('◉', 'preview');
export const WarningIcon = makeIcon('!', 'warning');
