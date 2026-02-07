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
