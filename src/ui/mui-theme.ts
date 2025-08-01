// src/ui/mui-theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    /* iOS 风格配色 ---------------------------------------------------- */
    primary  : { main: '#007aff' },   // Apple 蓝
    secondary: { main: '#ff9500' },   // Apple 橙
    background: {
      default: '#f2f2f7',
      paper  : '#ffffff',
    },
  },
  shape: {
    borderRadius: 8,                  // 所有控件圆角
  },
  typography: {
    fontFamily:
      '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", ' +
      'Roboto, Helvetica, Arial, sans-serif',
    button: { textTransform: 'none', fontWeight: 500 },
  },
  /* 全局默认尺寸 ------------------------------------------------------ */
  components: {
    MuiTextField:   { defaultProps: { size: 'small', fullWidth: true } },
    MuiSelect:      { defaultProps: { size: 'small', fullWidth: true } },
    MuiAutocomplete:{ defaultProps: { size: 'small', fullWidth: true } },
    MuiButton:      { styleOverrides: { root: { borderRadius: 8 } } },
  },
});