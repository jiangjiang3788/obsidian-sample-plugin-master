# Think OS CSS Final Architecture

## Single entry

All plugin CSS enters through `src/styles/main.css`. No CSS file may be added under
`src/shared/styles`; that directory contains TypeScript theme integration only.

## Ownership

```text
src/styles/
├─ tokens/       semantic, density and data palettes
├─ foundations/  scope, typography, focus and motion
├─ primitives/   buttons, inputs, cards, chips, tabs and toolbars
├─ components/   reusable composed UI contracts
├─ features/     settings and business-view styling
└─ overrides/    reviewed Obsidian/MUI host bridges only
```

A rule must live at the lowest reusable layer that owns its visual decision.
Business views never modify primitive internals, and host selectors never appear
outside `overrides/`.

## Cascade decision

Think OS tokens use a named cascade layer. Host-facing component and feature CSS is
unlayered and ordered explicitly in `main.css`. This is deliberate: Obsidian and
community-theme CSS is normally unlayered, and unlayered author CSS outranks layered
normal declarations regardless of selector specificity. Narrow root scopes and
semantic class names provide internal isolation; reviewed host overrides load last.

## Static versus dynamic styling

CSS owns fixed skin, state and responsive behavior. TSX may retain only values that
exist at runtime, such as freeform coordinates, chart ratios, measured dimensions,
context-menu positions and data-derived colors exposed through CSS custom properties.


## Feature CSS facades

Large feature styles may be split into domain files, but the public import path in
`main.css` stays stable. The facade file must contain only ordered `@import` rules
and a short contract comment. V15 applies this to:

```text
src/styles/features/settings-editors.css
src/styles/features/statistics.css
src/styles/features/excel.css
src/styles/features/view-shell.css
```

This keeps feature ownership explicit while avoiding 500+ line CSS files. The CSS
audit and boundary gate ignore `@import` URLs when counting selectors, so split
filenames do not become fake class names.

## Final budgets

| Metric | Limit |
|---|---:|
| CSS files | 65 |
| CSS source lines | 7,300 |
| `!important` | 12 |
| Hardcoded colors outside tokens | 0 |
| Duplicate classes across files | 90 |
| `sx={{...}}` occurrences | 255 |
| `style={{...}}` occurrences | 114 |

The limits are ceilings, not targets. Every later change should reduce or preserve
them. Run `npm run css:verify` before merging CSS work.
