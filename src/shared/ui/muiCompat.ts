// src/shared/ui/muiCompat.ts
/**
 * MUI + Preact type-compat exports.
 *
 * Why this exists:
 * - The project renders UI with Preact (`jsxImportSource: preact` + `react -> preact/compat`).
 * - @mui/material is typed against React, and a few components (Tooltip/Stack/etc.) can become
 *   overly strict under Preact's JSX types, leading to scattered `@ts-ignore` in UI files.
 *
 * Strategy:
 * - Centralise the (explicit) casting in one place.
 * - Keep UI files free of `@ts-ignore` for MUI/Preact interop.
 *
 * Notes:
 * - This is intentionally small. Add exports only as needed.
 */

import * as Mui from '@mui/material';

// Using `any` here is deliberate: it isolates the interop boundary and prevents
// `@ts-ignore` from spreading through the codebase.
type AnyMuiComponent = any;

// Commonly used components in Preact-based UI code.
export const Box = Mui.Box as AnyMuiComponent;
export const Stack = Mui.Stack as AnyMuiComponent;
export const Typography = Mui.Typography as AnyMuiComponent;
export const TextField = Mui.TextField as AnyMuiComponent;
export const Button = Mui.Button as AnyMuiComponent;
export const IconButton = Mui.IconButton as AnyMuiComponent;
export const Tooltip = Mui.Tooltip as AnyMuiComponent;
export const Divider = Mui.Divider as AnyMuiComponent;

export const Checkbox = Mui.Checkbox as AnyMuiComponent;
export const FormControlLabel = Mui.FormControlLabel as AnyMuiComponent;
export const FormGroup = Mui.FormGroup as AnyMuiComponent;
export const Chip = Mui.Chip as AnyMuiComponent;
export const Popover = Mui.Popover as AnyMuiComponent;

export const Paper = Mui.Paper as AnyMuiComponent;

export const List = Mui.List as AnyMuiComponent;

export const ListItemButton = Mui.ListItemButton as AnyMuiComponent;

export const Collapse = Mui.Collapse as AnyMuiComponent;

export const InputAdornment = Mui.InputAdornment as AnyMuiComponent;

export const Popper = Mui.Popper as AnyMuiComponent;

export const ClickAwayListener = Mui.ClickAwayListener as AnyMuiComponent;

export const Dialog = Mui.Dialog as AnyMuiComponent;

export const DialogTitle = Mui.DialogTitle as AnyMuiComponent;

export const DialogContent = Mui.DialogContent as AnyMuiComponent;

export const DialogActions = Mui.DialogActions as AnyMuiComponent;

export const CircularProgress = Mui.CircularProgress as AnyMuiComponent;

export const ListItemIcon = Mui.ListItemIcon as AnyMuiComponent;

export const ListItemText = Mui.ListItemText as AnyMuiComponent;

export const ThemeProvider = Mui.ThemeProvider as AnyMuiComponent;

export const CssBaseline = Mui.CssBaseline as AnyMuiComponent;

export const Tabs = Mui.Tabs as AnyMuiComponent;

export const Tab = Mui.Tab as AnyMuiComponent;

export const FormControl = Mui.FormControl as AnyMuiComponent;
export const InputLabel = Mui.InputLabel as AnyMuiComponent;
export const MenuItem = Mui.MenuItem as AnyMuiComponent;
export const Select = Mui.Select as AnyMuiComponent;
export const Switch = Mui.Switch as AnyMuiComponent;

export const Accordion = Mui.Accordion as AnyMuiComponent;
export const AccordionSummary = Mui.AccordionSummary as AnyMuiComponent;
export const AccordionDetails = Mui.AccordionDetails as AnyMuiComponent;

export const Alert = Mui.Alert as AnyMuiComponent;
export const Radio = Mui.Radio as AnyMuiComponent;
export const RadioGroup = Mui.RadioGroup as AnyMuiComponent;
export const FormLabel = Mui.FormLabel as AnyMuiComponent;
export const Autocomplete = Mui.Autocomplete as AnyMuiComponent;
export const Menu = Mui.Menu as AnyMuiComponent;

export const TableRow = Mui.TableRow as AnyMuiComponent;
export const TableCell = Mui.TableCell as AnyMuiComponent;

export const Slider = Mui.Slider as AnyMuiComponent;
export const LinearProgress = Mui.LinearProgress as AnyMuiComponent;
export const Grid = Mui.Grid as AnyMuiComponent;
export const Card = Mui.Card as AnyMuiComponent;
export const CardContent = Mui.CardContent as AnyMuiComponent;
export const TableHead = Mui.TableHead as AnyMuiComponent;
export const TableBody = Mui.TableBody as AnyMuiComponent;
export const ListItem = Mui.ListItem as AnyMuiComponent;
export const Table = Mui.Table as AnyMuiComponent;
