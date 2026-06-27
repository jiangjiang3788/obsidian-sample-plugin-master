// Think OS MUI bridge.
// MUI keeps safe concrete palette fallbacks for its internal color math, while
// component skin consumes --think-* variables so the visible UI follows the
// active Obsidian theme.

import { createTheme } from '@mui/material/styles';

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

export function createThinkMuiTheme(mode: ThinkMuiColorMode) {
  const fallback = fallbackPalette[mode];

  return createTheme({
    palette: {
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
    },
    spacing: 4,
    shape: {
      borderRadius: 8,
    },
    typography: {
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
    },
    components: {
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
      MuiDivider: {
        styleOverrides: { root: { borderColor: 'var(--think-border-subtle)' } },
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
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 'var(--think-radius-md, 8px)',
            color: 'var(--think-text-primary)',
          },
        },
      },
    },
  } as any);
}

/** Legacy export for call sites that cannot yet observe the host mode. */
export const theme = createThinkMuiTheme('light');
