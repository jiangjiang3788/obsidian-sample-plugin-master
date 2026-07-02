import type { ThemeOptions } from '@mui/material/styles';

export const thinkMuiTypography: ThemeOptions['typography'] = {
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
