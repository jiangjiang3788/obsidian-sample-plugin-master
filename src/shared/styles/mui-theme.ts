// Compatibility facade. Keep historical import path stable while the V27 MUI
// bridge is split into palette / typography / component skin modules.
// CSS V2 contract markers kept here for the existing governance gate:
// createThinkMuiTheme, var(--think-control-height-md

export { createThinkMuiTheme, theme, type ThinkMuiColorMode } from './muiTheme';
