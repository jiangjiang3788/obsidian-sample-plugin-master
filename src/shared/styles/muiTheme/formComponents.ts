import type { ThinkMuiComponents } from './types';

export const thinkMuiFormComponents: ThinkMuiComponents = {
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        minHeight: 'var(--think-control-height-md, 32px)',
        borderRadius: 'var(--think-radius-sm, 6px)',
        backgroundColor: 'var(--think-bg-surface-1)',
        color: 'var(--think-text-primary)',
        fontSize: 'var(--think-font-size-sm, 13px)',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: 'var(--think-border-subtle)',
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: 'var(--think-border-strong)',
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderWidth: 1,
          borderColor: 'var(--think-border-focus)',
        },
        '&.Mui-error .MuiOutlinedInput-notchedOutline': {
          borderColor: 'var(--think-danger)',
        },
        '&.Mui-disabled': {
          backgroundColor: 'var(--think-bg-disabled)',
          color: 'var(--think-text-disabled)',
        },
      },
      input: {
        height: 'auto',
        padding: '7px var(--think-space-4, 8px)',
        '&::placeholder': {
          color: 'var(--think-text-subtle)',
          opacity: 1,
        },
      },
      multiline: {
        minHeight: 80,
        padding: 'var(--think-space-4, 8px)',
      },
    },
  },
  MuiInputLabel: {
    styleOverrides: {
      root: {
        color: 'var(--think-text-secondary)',
        fontSize: 'var(--think-font-size-sm, 13px)',
        '&.Mui-focused': { color: 'var(--think-text-accent)' },
        '&.Mui-error': { color: 'var(--think-danger)' },
      },
    },
  },
  MuiFormHelperText: {
    styleOverrides: {
      root: {
        marginInline: 0,
        color: 'var(--think-text-secondary)',
        fontSize: 'var(--think-font-size-xs, 12px)',
        '&.Mui-error': { color: 'var(--think-danger)' },
      },
    },
  },
  MuiFormLabel: {
    styleOverrides: {
      root: {
        color: 'var(--think-text-primary)',
        fontSize: 'var(--think-font-size-sm, 13px)',
        fontWeight: 'var(--think-font-weight-medium, 500)',
        '&.Mui-focused': { color: 'var(--think-text-primary)' },
      },
    },
  },
  MuiSelect: {
    styleOverrides: {
      icon: { color: 'var(--think-text-secondary)' },
      select: { paddingBlock: '7px' },
    },
  },
  MuiCheckbox: {
    styleOverrides: {
      root: {
        color: 'var(--think-text-secondary)',
        '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: 'var(--think-accent)' },
      },
    },
  },
  MuiRadio: {
    styleOverrides: {
      root: {
        color: 'var(--think-text-secondary)',
        '&.Mui-checked': { color: 'var(--think-accent)' },
      },
    },
  },
  MuiSwitch: {
    styleOverrides: {
      root: { width: 38, height: 24, padding: 4 },
      switchBase: {
        padding: 6,
        '&.Mui-checked': {
          color: 'var(--think-text-on-accent)',
          '& + .MuiSwitch-track': { backgroundColor: 'var(--think-accent)', opacity: 1 },
        },
      },
      thumb: { width: 12, height: 12, boxShadow: 'none' },
      track: { borderRadius: 10, backgroundColor: 'var(--think-border-strong)', opacity: 1 },
    },
  },
  MuiFormControlLabel: {
    styleOverrides: {
      root: {
        minHeight: 'var(--think-control-height-sm, 28px)',
        marginInline: 0,
        gap: 'var(--think-space-3, 6px)',
      },
      label: {
        color: 'var(--think-text-primary)',
        fontSize: 'var(--think-font-size-sm, 13px)',
      },
    },
  },
};
