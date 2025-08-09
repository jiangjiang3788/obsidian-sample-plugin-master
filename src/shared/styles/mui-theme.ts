// src/shared/styles/mui-theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary:  { main: '#007aff' },
    secondary:{ main: '#ff9500' },
    background: { default: '#f2f2f7', paper: '#ffffff' },
  },

  // 全局直角：去掉“到处都是 5px 小圆角”的观感
  shape: { borderRadius: 0 },

  // 全局阴影关闭：解决“整体阴影太重”
  shadows: Array(25).fill('none') as any,

  // 加快折叠/展开动画
  transitions: {
    duration: {
      shortest: 80,
      shorter : 120,
      short   : 150,
      standard: 180,
      enteringScreen: 180,
      leavingScreen : 120,
    },
  },

  components: {
    // 纸面默认无阴影
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { boxShadow: 'none' } },
    },

    // Accordion 去掉阴影、分割线、圆角，并加快动画
    MuiAccordion: {
      defaultProps: { disableGutters: true, square: true, TransitionProps: { timeout: 120 } as any },
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderRadius: 0,
          '&::before': { display: 'none' },   // 去掉那条细分割线
        },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: { root: { paddingTop: 8, paddingBottom: 8 } },
    },

    // 全局尺寸和外观（保留你原来的习惯）
    MuiTextField:   { defaultProps: { size: 'small', fullWidth: true } },
    MuiSelect:      { defaultProps: { size: 'small', fullWidth: true } },
    MuiAutocomplete:{ defaultProps: { size: 'small', fullWidth: true } },
    MuiButton:      { styleOverrides: { root: { borderRadius: 0 } } }, // 与直角统一
  },
});