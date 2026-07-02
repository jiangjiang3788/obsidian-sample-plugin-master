import type { ThinkMuiComponents } from './types';

export const thinkMuiSurfaceComponents: ThinkMuiComponents = {
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        backgroundColor: 'var(--think-bg-elevated)',
        color: 'var(--think-text-primary)',
        borderColor: 'var(--think-border-subtle)',
      },
      rounded: { borderRadius: 'var(--think-radius-md, 8px)' },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        border: '1px solid var(--think-border-subtle)',
        borderRadius: 'var(--think-radius-md, 8px)',
        backgroundColor: 'var(--think-bg-surface-1)',
        boxShadow: 'var(--think-shadow-none)',
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        minHeight: 26,
        height: 26,
        borderRadius: 'var(--think-radius-pill)',
        border: '1px solid var(--think-border-subtle)',
        backgroundColor: 'var(--think-bg-surface-1)',
        color: 'var(--think-text-secondary)',
        fontSize: 'var(--think-font-size-xs, 12px)',
        '&:hover': { backgroundColor: 'var(--think-bg-hover)' },
        '&.MuiChip-colorPrimary': {
          borderColor: 'var(--think-accent)',
          backgroundColor: 'var(--think-accent-muted)',
          color: 'var(--think-text-accent)',
        },
      },
      deleteIcon: {
        color: 'inherit',
        '&:hover': { color: 'var(--think-text-primary)' },
      },
    },
  },
  MuiAccordion: {
    styleOverrides: {
      root: {
        border: '1px solid var(--think-border-subtle)',
        backgroundColor: 'var(--think-bg-surface-1)',
        boxShadow: 'none',
        '&::before': { display: 'none' },
      },
    },
  },
};
