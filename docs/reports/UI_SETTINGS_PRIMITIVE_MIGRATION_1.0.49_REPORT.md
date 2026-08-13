# Think OS UI Settings Primitive Migration 1.0.49

## Status

Phase 5 corrective release. Code convergence is complete; visual acceptance is still pending. Phase 6 must not start until the Settings screenshots are accepted.

## User-visible corrections

- Toolbar controls share one framed language and one height. The toolbar stays on one line and scrolls horizontally in a narrow Obsidian leaf rather than wrapping the filter trigger.
- Floating layout/module Settings use explicit inner padding.
- Settings field rows use a 112px semantic label column on the left and the control/content on the right. Stacking is only a very-narrow-width fallback.
- Common filters and advanced rules are flat rows/dividers instead of nested cards.
- Comboboxes own one outer border; the inner native input is borderless.
- Frequent-use instructional copy remains removed unless it communicates a constraint, safety issue, side effect, error, or genuinely non-obvious state.

## Code convergence

- `src/features/settings` has no direct `@mui` / `muiCompat` imports.
- Shared Settings controls use Think primitives (`ThinkInput`, `ThinkSelect`, `ThinkCheckbox`, `ThinkDisclosure`, `ThinkCombobox`, `ThinkMultiCombobox`, `ThinkSearchPicker`, shared buttons/icons).
- Shared combobox/select implementations used by Settings are native/Think implementations rather than MUI Autocomplete/TextField wrappers.
- FloatingPanel no longer needs MUI Paper for the Settings shell.
- Static RuleBuilder grid skin moved from TSX inline styles to semantic CSS classes.
- New `!important` fixes introduced during the migration were removed; the obsolete MUI input-reset override was reverted.

## Validation

- Architecture gate: PASS.
- Records gate: PASS.
- Task Session gate: PASS.
- Energy gate: PASS.
- Quality gate: PASS.
- UI runtime gate: all runtime checks PASS; CSS boundary remains blocked only by the pre-existing total CSS line budget.
- Product/Stability remain blocked by the source package missing `.github/workflows/ci.yml`; this release does not fabricate CI configuration.
- Full dependency-backed typecheck/build is environment-dependent because the supplied worktree has no installed dependency tree; syntax transpilation is used as an additional local check.

## Visual acceptance checklist

1. Toolbar: same-height framed period/date/arrows/calendar/filter/settings; no second row.
2. Layout floating window: content has visible breathing room on all edges.
3. General Settings/View Editors: label left, control right at normal widths.
4. Global/view filter: no card-on-card or input-inside-input borders.
5. Obsidian light/dark/community-theme appearance stays host-native.
