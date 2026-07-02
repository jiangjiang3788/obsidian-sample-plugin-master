import type { ThinkMuiComponents } from './types';

export const thinkMuiControlComponents: ThinkMuiComponents = {
  MuiButtonBase: {
    defaultProps: {
      disableRipple: true,
    },
  },
  MuiButton: {
    defaultProps: {
      disableElevation: true,
      size: 'medium',
    },
    styleOverrides: {
      root: {
        minHeight: 'var(--think-control-height-md, 32px)',
        padding: '0 var(--think-space-5, 12px)',
        borderRadius: 'var(--think-radius-sm, 6px)',
        color: 'var(--think-text-primary)',
        fontSize: 'var(--think-font-size-sm, 13px)',
        fontWeight: 'var(--think-font-weight-medium, 500)',
        lineHeight: 1,
        textTransform: 'none',
        transition: 'background-color var(--think-duration-fast) var(--think-ease-standard), border-color var(--think-duration-fast) var(--think-ease-standard), color var(--think-duration-fast) var(--think-ease-standard), opacity var(--think-duration-fast) var(--think-ease-standard)',
        '&.MuiButton-sizeSmall': {
          minHeight: 'var(--think-control-height-sm, 28px)',
          paddingInline: 'var(--think-space-4, 8px)',
          fontSize: 'var(--think-font-size-xs, 12px)',
        },
        '&.MuiButton-sizeLarge': {
          minHeight: 'var(--think-control-height-lg, 36px)',
          paddingInline: '14px',
          fontSize: 'var(--think-font-size-md, 14px)',
        },
        '&.MuiButton-contained': {
          backgroundColor: 'var(--think-accent)',
          color: 'var(--think-text-on-accent)',
          '&:hover': { backgroundColor: 'var(--think-accent-hover)' },
        },
        '&.MuiButton-outlined': {
          backgroundColor: 'var(--think-bg-surface-1)',
          borderColor: 'var(--think-border-subtle)',
          color: 'var(--think-text-primary)',
          '&:hover': {
            backgroundColor: 'var(--think-bg-hover)',
            borderColor: 'var(--think-border-strong)',
          },
        },
        '&.MuiButton-text': {
          color: 'var(--think-text-secondary)',
          '&:hover': {
            backgroundColor: 'var(--think-bg-hover)',
            color: 'var(--think-text-primary)',
          },
        },
        '&.MuiButton-colorError': {
          color: 'var(--think-danger)',
          '&.MuiButton-contained': {
            backgroundColor: 'var(--think-danger)',
            color: 'var(--think-text-on-accent)',
          },
          '&:hover': { backgroundColor: 'var(--think-danger-bg)' },
        },
        '&.Mui-disabled': {
          backgroundColor: 'var(--think-bg-disabled)',
          borderColor: 'var(--think-border-subtle)',
          color: 'var(--think-text-disabled)',
          opacity: 0.68,
        },
      },
    },
  },
  MuiIconButton: {
    defaultProps: { size: 'medium' },
    styleOverrides: {
      root: {
        width: 'var(--think-control-height-md, 32px)',
        height: 'var(--think-control-height-md, 32px)',
        padding: 0,
        border: '1px solid transparent',
        borderRadius: 'var(--think-radius-sm, 6px)',
        color: 'var(--think-text-secondary)',
        '&:hover': {
          backgroundColor: 'var(--think-bg-hover)',
          borderColor: 'var(--think-border-subtle)',
          color: 'var(--think-text-primary)',
        },
        '&.MuiIconButton-sizeSmall': {
          width: 'var(--think-control-height-sm, 28px)',
          height: 'var(--think-control-height-sm, 28px)',
        },
        '&.MuiIconButton-sizeLarge': {
          width: 'var(--think-control-height-lg, 36px)',
          height: 'var(--think-control-height-lg, 36px)',
        },
        '&.Mui-disabled': {
          color: 'var(--think-text-disabled)',
          opacity: 0.56,
        },
      },
    },
  },
};
