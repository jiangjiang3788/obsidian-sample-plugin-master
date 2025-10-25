// src/shared/styles/mui-theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary:  { main: '#007aff' },
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
    /**
     * @description 全局禁用涟漪(点击波纹)效果
     * MuiButtonBase 是 Button, IconButton 等所有可点击组件的基础。
     */
    MuiButtonBase: {
        defaultProps: {
            disableRipple: true, // 彻底禁用涟漪效果
        },
    },

    /**
     * @description 移除 Paper 组件的投影
     * Paper 组件是悬浮窗、卡片等的基础。
     */
    MuiPaper: {
        styleOverrides: {
            root: {
                boxShadow: 'none',
            },
        },
    },
    
    /**
     * @description 移除 Button 组件的投影
     */
    MuiButton: {
        styleOverrides: {
            root: {
                borderRadius: 6,
                boxShadow: 'none', // 移除默认状态的投影
                '&:hover': {
                    boxShadow: 'none', // 移除悬浮状态的投影
                }
            },
            contained: {
                boxShadow: 'none',
                '&:hover': {
                    boxShadow: 'none',
                }
            }
        }
    },

    // ====================== [核心修改：解决圆形背景问题] ======================
    /**
     * @description 移除 IconButton 的背景
     * 这里的修改会确保图标按钮在任何状态（包括鼠标悬停）下都没有背景，
     * 从而消除您看到的那个圆形/椭圆形框。
     */
    MuiIconButton: {
        defaultProps: {
            // MuiButtonBase 已经禁用了 ripple，这里是双重保险
            disableRipple: true, 
        },
        styleOverrides: {
            root: {
              // 强制背景色为透明
                backgroundColor: 'transparent !important',
              // 覆盖鼠标悬停时的背景色，同样设为透明
                '&:hover': {
                    backgroundColor: 'transparent !important',
                }
            }
        }
    },
    // =====================================================================

    MuiTextField:    { defaultProps: { size: 'small', variant: 'standard', fullWidth: true } },
    MuiSelect:       { defaultProps: { size: 'small', variant: 'standard' } },
    MuiAutocomplete: { defaultProps: { size: 'small' } },
    MuiInputBase: {
      styleOverrides: {
        root:  { minHeight: 0 },
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