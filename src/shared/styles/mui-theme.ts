// src/ui/styles/mui-theme.ts
// MUI主题配置

import { createTheme } from '@mui/material/styles';

// 使用具体颜色值而不是CSS变量，避免MUI生产模式错误
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#7c3aed', // 紫色，类似--interactive-accent
    },
    secondary: {
      main: '#6366f1', // 蓝紫色
    },
    background: {
      default: '#ffffff',
      paper: '#f8fafc',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  components: {
    // 使用CSS-in-JS而不是CSS变量来避免生产模式错误
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#f8fafc',
          color: '#1e293b',
          // 暗色主题支持
          '.theme-dark &': {
            backgroundColor: '#1e293b',
            color: '#f1f5f9',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontSize: '14px',
        },
      },
    },
  },
});
