import type { ThinkMuiComponents } from './types';

export const thinkMuiOverlayComponents: ThinkMuiComponents = {
  MuiDialog: {
    styleOverrides: {
      paper: {
        maxHeight: 'min(85vh, calc(100vh - 32px))',
        border: '1px solid var(--think-border-subtle)',
        borderRadius: 'var(--think-radius-lg, 12px)',
        backgroundColor: 'var(--think-bg-elevated)',
        boxShadow: 'var(--think-shadow-overlay)',
      },
    },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: {
        padding: 'var(--think-space-6, 16px)',
        color: 'var(--think-text-primary)',
        fontSize: 'var(--think-font-size-lg, 16px)',
        fontWeight: 'var(--think-font-weight-semibold, 600)',
      },
    },
  },
  MuiDialogContent: {
    styleOverrides: { root: { padding: '0 var(--think-space-6, 16px) var(--think-space-6, 16px)' } },
  },
  MuiDialogActions: {
    styleOverrides: {
      root: {
        gap: 'var(--think-space-4, 8px)',
        padding: 'var(--think-space-5, 12px) var(--think-space-6, 16px)',
        borderTop: '1px solid var(--think-border-subtle)',
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: 'var(--think-radius-xs, 4px)',
        backgroundColor: 'var(--think-text-primary)',
        color: 'var(--think-bg-canvas)',
        fontSize: 'var(--think-font-size-xs, 12px)',
      },
    },
  },
};
