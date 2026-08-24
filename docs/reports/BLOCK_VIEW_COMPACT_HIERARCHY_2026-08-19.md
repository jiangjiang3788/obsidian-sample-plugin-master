# BlockView Compact Hierarchy Fix — 2026-08-19

## Problem

BlockView hierarchy spacing became visually too loose after the shared list/rhythm convergence work.
The issue is not a single oversized margin. Two system contracts were stacking:

1. `bv-group-title` consumed the standard `think-list-disclosure-row` density, which uses the normal list-row minimum height.
2. Block data groups were treated like ordinary sibling sections and received `related` / `row` rhythm between tree nodes.

That mapping is appropriate for standalone sections, but BlockView is a dense recursive tree. At every nesting level the row height and sibling rhythm accumulate, making the vertical guide lines contain large empty bands.

## Design decision

Keep the cross-view list system, but classify Block group headings as **compact tree rows** rather than standard disclosure rows.

- Do not shrink global rhythm tokens.
- Do not change EventTimeline, Progress, Settings, or normal list rows.
- Do not remove hierarchy guides or indentation.
- Reuse the existing shared `think-list-row--compact` modifier instead of inventing a Block-only pixel scale.
- Lock the exception in UI governance so a future convergence pass does not re-expand BlockView.

## Runtime changes

### `src/features/views/runtime/BlockViewModel.ts`

Block group headings now render with:

`bv-group-title think-list-disclosure-row think-list-row--compact`

This makes the density choice explicit at the consumer boundary.

### `src/styles/components/task-row.css`

The existing compact modifier now has a higher-specificity disclosure-row selector, so it can override the standard disclosure min-height/padding even though the base disclosure rule appears later in the stylesheet.

Default desktop geometry changes from the standard list-row height to the compact list-row height:

- standard group title min-height: roughly 32px with the default host control scale;
- compact group title min-height: roughly 24px with the same scale;
- compact-density mode continues to derive from density tokens;
- coarse-pointer mode still expands through the existing control-height tokens instead of using hard-coded desktop values.

### `src/styles/components/grouped-container.css`

Block tree spacing is remapped by semantic proximity:

- root sibling group gap: `--think-rhythm-related` (8px) -> `--think-rhythm-inline` (4px);
- nested sibling group gap: `--think-rhythm-row` (6px) -> `--think-space-1` (2px);
- title icon/text gap: shared row gap (6px) -> `--think-space-2` (4px);
- title line-height: inherited normal rhythm -> `--think-line-height-tight`, matching its subsection/label typography role.

Leaf rows, indentation, and guide-line ownership are unchanged.

## Governance changes

### `scripts/gates/checks/list-hierarchy-convergence-gate.mjs`

The gate now requires BlockView to explicitly opt into compact group-title density and requires shared list CSS to support compact disclosure rows.

### `scripts/gates/checks/rhythm-boundary-convergence-gate.mjs`

The gate no longer forces Block tree nodes to use section-like spacing. It now locks the compact root/nested hierarchy rhythm.

### `test/unit/blockViewModel.test.ts`

The class-name contract asserts both disclosure semantics and the compact density modifier.

## Scrollbar governance cleanup

The previous all-view hidden-scrollbar change remains in `src/styles/foundations/scope.css`, but the four `!important` declarations were removed. The scoped selectors are sufficient and this restores CSS-boundary gate compliance.

## Verification

Passed in the patched tree:

- `node --check main.js`
- `list-hierarchy-convergence-gate.mjs`
- `rhythm-boundary-convergence-gate.mjs`
- full `ui-runtime-gate.mjs`
- CSS audit: 72 files, 8498 / 8500 lines, 7 `!important`, 0 hard-coded UI colors outside token files

The bundled `main.js` and `styles.css` were updated to match the source changes, so the package can be tested directly without requiring a local rebuild first.
