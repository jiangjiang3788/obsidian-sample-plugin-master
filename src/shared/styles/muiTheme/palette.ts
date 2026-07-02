import type { ThemeOptions } from '@mui/material/styles';

import type { ThinkMuiColorMode } from './types';

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

export function createThinkMuiPalette(mode: ThinkMuiColorMode): ThemeOptions['palette'] {
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
