// src/shared/styles/mui-theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary:  { main: '#007aff' },
    secondary:{ main: '#ff9500' },
    success:  { main: '#34c759' },
    background: { default:'#f7f7f9', paper:'#fff' },
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily:
      '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", ' +
      'Roboto, Helvetica, Arial, sans-serif',
    fontSize: 13,
    button: { textTransform: 'none', fontWeight: 500, fontSize: 13 },
  },
  components: {
    MuiIconButton: {
        defaultProps: {
            disableRipple: true, // 彻底禁用涟漪(投影)效果
        },
        styleOverrides: {
            root: {
                backgroundColor: 'transparent !important',
                '&:hover': {
                    backgroundColor: 'transparent !important',
                }
            }
        }
    },
    MuiTextField:    { defaultProps: { size: 'small', variant: 'standard', fullWidth: true } },
    MuiSelect:       { defaultProps: { size: 'small', variant: 'standard' } },
    MuiAutocomplete: { defaultProps: { size: 'small' } },
    MuiButton:       { styleOverrides: { root: { borderRadius: 6, boxShadow: 'none' } } },
    MuiInputBase: {
      styleOverrides: {
        root:  { minHeight: 0 },
        input: {
          height: 24,
          padding: '4px 8px',
          fontSize: 13,
        },
      },
    },
    MuiInput: {
      styleOverrides: {
        root: {
          '&:before,&:after,&:hover:not(.Mui-disabled):before': {
            borderBottom: '0 !important',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.15)' } },
        input: { padding: '6px 10px' },
      },
    },
    MuiFormControl: {
      styleOverrides: { root: { margin: 0 } },
    },
    MuiBox: {
        styleOverrides: {
            root: {
                '&[role="tabpanel"]': {
                    padding: '8px 16px',
                }
            }
        }
    }
  },
});