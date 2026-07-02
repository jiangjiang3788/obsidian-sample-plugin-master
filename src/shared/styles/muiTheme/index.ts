// Think OS MUI bridge.
// MUI keeps safe concrete palette fallbacks for its internal color math, while
// component skin consumes --think-* variables so the visible UI follows the
// active Obsidian theme.

import { createTheme, type ThemeOptions } from '@mui/material/styles';

import { thinkMuiComponents } from './components';
import { createThinkMuiPalette } from './palette';
import { thinkMuiTypography } from './typography';
import type { ThinkMuiColorMode } from './types';

export type { ThinkMuiColorMode } from './types';

export function createThinkMuiTheme(mode: ThinkMuiColorMode) {
  const options: ThemeOptions = {
    palette: createThinkMuiPalette(mode),
    spacing: 4,
    shape: {
      borderRadius: 8,
    },
    typography: thinkMuiTypography,
    components: thinkMuiComponents,
  };

  return createTheme(options);
}

/** Legacy export for call sites that cannot yet observe the host mode. */
export const theme = createThinkMuiTheme('light');
