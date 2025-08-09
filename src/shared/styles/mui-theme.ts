// src/shared/styles/mui-theme.ts
// —— 极简紧凑主题：输入高度更低、去下划线、减少外边距
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary:  { main: '#007aff' },
    secondary:{ main: '#ff9500' },
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
    MuiTextField:    { defaultProps: { size: 'small', variant: 'standard', fullWidth: true } },
    MuiSelect:       { defaultProps: { size: 'small', variant: 'standard' } },
    MuiAutocomplete: { defaultProps: { size: 'small' } },
    MuiButton:       { styleOverrides: { root: { borderRadius: 6, boxShadow: 'none' } } },

    // 关键：把输入高度和内边距压到更小
    MuiInputBase: {
      styleOverrides: {
        root:  { minHeight: 0 },                                       // 不要撑高容器
        input: {
          height: 22, lineHeight: '22px', padding: '0 6px',            // 比日期框还矮
          fontSize: 13,
        },
      },
    },

    // 去掉 standard 变体的底部灰线
    MuiInput: {
      styleOverrides: {
        root: {
          '&:before,&:after,&:hover:not(.Mui-disabled):before': {
            borderBottom: '0 !important',
          },
        },
      },
    },

    // 兼容偶尔出现的 outlined，弱化边框
    MuiOutlinedInput: {
      styleOverrides: {
        root: { '& .MuiOutlinedInput-notchedOutline': { borderColor: '#ddd' } },
        input: { padding: '2px 6px' },
      },
    },

    // 控制 FormControl 的外边距，别让它把行距撑大
    MuiFormControl: {
      styleOverrides: { root: { margin: 0 } },
    },
  },
});