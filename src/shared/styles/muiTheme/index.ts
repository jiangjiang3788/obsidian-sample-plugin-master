// Think OS MUI bridge.
import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { thinkMuiComponents } from './components';

export type ThinkMuiColorMode = 'light' | 'dark';

const fallbackPalette = {
  light: {
    primary: '#6d4aff',
    secondary: '#5b6472',
    error: '#c93636',
    warning: '#9a6700',
    success: '#1f7a4c',
    info: '#2764c7',
    backgroundDefault: '#ffffff',
    backgroundPaper: '#f7f7f8',
    textPrimary: '#202124',
    textSecondary: '#666a73',
    divider: '#d8d9dc',
  },
  dark: {
    primary: '#a896ff',
    secondary: '#aab0bc',
    error: '#ff8b8b',
    warning: '#e7bd68',
    success: '#72d3a0',
    info: '#8bb7ff',
    backgroundDefault: '#202124',
    backgroundPaper: '#292a2d',
    textPrimary: '#f1f1f2',
    textSecondary: '#b0b2b8',
    divider: '#45474d',
  },
} as const;

function createThinkMuiPalette(mode: ThinkMuiColorMode): ThemeOptions['palette'] {
  const fallback = fallbackPalette[mode];

  return {
    mode,
    primary: { main: fallback.primary },
    secondary: { main: fallback.secondary },
    error: { main: fallback.error },
    warning: { main: fallback.warning },
    success: { main: fallback.success },
    info: { main: fallback.info },
    background: {
      default: fallback.backgroundDefault,
      paper: fallback.backgroundPaper,
    },
    text: {
      primary: fallback.textPrimary,
      secondary: fallback.textSecondary,
    },
    divider: fallback.divider,
  };
}

const thinkMuiTypography: ThemeOptions['typography'] = {
  fontFamily: 'var(--think-font-interface, var(--font-interface, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif))',
  fontSize: 13,
  button: {
    fontSize: 'var(--think-font-size-sm, 13px)',
    fontWeight: 500,
    lineHeight: 1,
    textTransform: 'none',
  },
  body1: {
    fontSize: 'var(--think-font-size-md, 14px)',
    lineHeight: 'var(--think-line-height-normal, 1.5)',
  },
  body2: {
    fontSize: 'var(--think-font-size-sm, 13px)',
    lineHeight: 'var(--think-line-height-normal, 1.5)',
  },
  caption: {
    fontSize: 'var(--think-font-size-xs, 12px)',
    lineHeight: 'var(--think-line-height-normal, 1.5)',
  },
  h6: {
    fontSize: 'var(--think-font-size-xl, 18px)',
    fontWeight: 600,
    lineHeight: 'var(--think-line-height-tight, 1.25)',
  },
};

export function createThinkMuiTheme(mode: ThinkMuiColorMode) {
  const options: ThemeOptions = {
    palette: createThinkMuiPalette(mode),
    spacing: 4,
    shape: { borderRadius: 8 },
    typography: thinkMuiTypography,
    components: thinkMuiComponents,
  };
  return createTheme(options);
}

/** Legacy export for call sites that cannot yet observe the host mode. */
export const theme = createThinkMuiTheme('light');
