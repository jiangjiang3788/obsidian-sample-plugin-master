# BlockView compact hierarchy patch

Base: previous 2026-08-19 Think OS UI systematic fix.

## Files changed for this pass

- `src/features/views/runtime/BlockViewModel.ts`
  - Explicitly applies shared compact list density to Block group headings.
- `src/styles/components/task-row.css`
  - Makes `think-list-row--compact` correctly override standard disclosure-row density.
- `src/styles/components/grouped-container.css`
  - Reduces Block root/nested sibling rhythm, title icon/text gap, and heading line-height without changing other views.
- `scripts/gates/checks/list-hierarchy-convergence-gate.mjs`
  - Locks the compact Block hierarchy contract.
- `scripts/gates/checks/rhythm-boundary-convergence-gate.mjs`
  - Treats Block as a compact tree instead of a stack of independent sections.
- `test/unit/blockViewModel.test.ts`
  - Adds class-contract regression assertions.
- `src/styles/foundations/scope.css`
  - Keeps default hidden scrollbars while removing unnecessary `!important` so CSS governance passes.
- `main.js`
  - Ready-to-use bundled runtime with the Block compact class change.
- `styles.css`
  - Ready-to-use bundled stylesheet with compact Block hierarchy + governed hidden scrollbars.
- `reports/css/css-audit-current.json`
  - Regenerated CSS audit.
- `docs/reports/BLOCK_VIEW_COMPACT_HIERARCHY_2026-08-19.md`
  - Root-cause and design-contract report.

## Intended visual result

BlockView stays structurally consistent with the shared list/hierarchy system, but the recursive tree becomes visibly denser:

- less vertical air inside each group heading;
- smaller gap between root groups;
- very small gap between nested sibling groups;
- unchanged leaf-row interaction, indentation, guide lines, hover behavior, and other views.
