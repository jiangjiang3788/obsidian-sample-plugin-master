import type { ThinkMuiComponents } from './types';

export const thinkMuiNavigationComponents: ThinkMuiComponents = {
  MuiTabs: {
    styleOverrides: {
      root: {
        minHeight: 'var(--think-control-height-lg, 36px)',
        borderBottom: '1px solid var(--think-border-subtle)',
      },
      indicator: {
        height: 2,
        backgroundColor: 'var(--think-accent)',
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        minHeight: 'var(--think-control-height-lg, 36px)',
        minWidth: 0,
        padding: '0 var(--think-space-5, 12px)',
        color: 'var(--think-text-secondary)',
        fontSize: 'var(--think-font-size-sm, 13px)',
        fontWeight: 'var(--think-font-weight-medium, 500)',
        textTransform: 'none',
        '&:hover': {
          backgroundColor: 'var(--think-bg-hover)',
          color: 'var(--think-text-primary)',
        },
        '&.Mui-selected': { color: 'var(--think-text-accent)' },
      },
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: {
        minHeight: 'var(--think-control-height-md, 32px)',
        borderRadius: 'var(--think-radius-xs, 4px)',
        fontSize: 'var(--think-font-size-sm, 13px)',
        '&:hover': { backgroundColor: 'var(--think-bg-hover)' },
        '&.Mui-selected': { backgroundColor: 'var(--think-accent-muted)' },
      },
    },
  },
  MuiDivider: {
    styleOverrides: { root: { borderColor: 'var(--think-border-subtle)' } },
  },
};
