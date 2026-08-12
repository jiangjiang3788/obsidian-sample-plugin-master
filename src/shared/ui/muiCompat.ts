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

// Preserve MUI's prop types at the compatibility boundary.  Erasing components to
// `any` also erases JSX contextual typing, which turns every UI callback into an
// implicit-any error after strict refactors.  React is mapped to preact/compat by
// tsconfig, so the component's own public prop contract is the correct boundary.

// Commonly used components in Preact-based UI code.
export const Box = Mui.Box;
export const Stack = Mui.Stack;
export const Typography = Mui.Typography;
export const TextField = Mui.TextField;
export const Button = Mui.Button;
export const IconButton = Mui.IconButton;
export const Tooltip = Mui.Tooltip;
export const Divider = Mui.Divider;

export const Checkbox = Mui.Checkbox;
export const FormControlLabel = Mui.FormControlLabel;
export const FormGroup = Mui.FormGroup;
export const Chip = Mui.Chip;
export const Popover = Mui.Popover;

export const Paper = Mui.Paper;

export const List = Mui.List;

export const ListItemButton = Mui.ListItemButton;

export const Collapse = Mui.Collapse;

export const InputAdornment = Mui.InputAdornment;

export const Popper = Mui.Popper;

export const ClickAwayListener = Mui.ClickAwayListener;

export const Dialog = Mui.Dialog;

export const DialogTitle = Mui.DialogTitle;

export const DialogContent = Mui.DialogContent;

export const DialogActions = Mui.DialogActions;

export const CircularProgress = Mui.CircularProgress;

export const ListItemIcon = Mui.ListItemIcon;

export const ListItemText = Mui.ListItemText;

export const ThemeProvider = Mui.ThemeProvider;

export const CssBaseline = Mui.CssBaseline;
export const ScopedCssBaseline = Mui.ScopedCssBaseline;

export const Tabs = Mui.Tabs;

export const Tab = Mui.Tab;

export const FormControl = Mui.FormControl;
export const InputLabel = Mui.InputLabel;
export const MenuItem = Mui.MenuItem;
export const Select = Mui.Select;
export const Switch = Mui.Switch;

export const Accordion = Mui.Accordion;
export const AccordionSummary = Mui.AccordionSummary;
export const AccordionDetails = Mui.AccordionDetails;

export const Alert = Mui.Alert;
export const Radio = Mui.Radio;
export const RadioGroup = Mui.RadioGroup;
export const FormLabel = Mui.FormLabel;
export const Autocomplete = Mui.Autocomplete;
export const Menu = Mui.Menu;

export const TableRow = Mui.TableRow;
export const TableCell = Mui.TableCell;

export const Slider = Mui.Slider;
export const LinearProgress = Mui.LinearProgress;
export const Grid = Mui.Grid;
export const Card = Mui.Card;
export const CardContent = Mui.CardContent;
export const TableHead = Mui.TableHead;
export const TableBody = Mui.TableBody;
export const ListItem = Mui.ListItem;
export const Table = Mui.Table;
