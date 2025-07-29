// src/ui/mui-theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',               // 自动切换可自行扩展
    primary: { main: '#5b8cff' },
    secondary: { main: '#00b96b' },
  },
  components: {
    MuiTextField: {
      defaultProps: { size: 'small', fullWidth: true },
    },
    MuiSelect: {
      defaultProps: { size: 'small', fullWidth: true },
    },
    MuiAutocomplete: {
      defaultProps: { size: 'small', fullWidth: true },
    },
  },
});