# Think OS 1.0.39 - Block / Statistics List Hierarchy Convergence

Date: 2026-08-12

## Goal

Remove nested card/surface styling from BlockView and StatisticsView while preserving their existing view types and data contracts. Hierarchy should read like the Energy task list: parent header, indented descendants, subtle guide/separator lines, and no empty group placeholders.

## BlockView

- `GroupedContainer` now drops zero-item nodes before rendering.
- Group level classes are generated from a single base class. This also fixes the previous Block class composition where `bv-group--level-*` could be malformed.
- BlockView no longer shares EventTimeline's card shell visually.
- Block groups use transparent surfaces, no border box, no rounded nested cards.
- Child groups and leaf rows are expressed with recursive indentation plus one subtle left guide line.
- Block rows and TaskRow leaves are flat list rows with lightweight separators.
- EventTimeline keeps its own grouped surface; this change does not flatten its time-axis groups.

## StatisticsView

- `PeriodData` now has shared `getPeriodDataTotal()` / `hasPeriodData()` semantics.
- Day/Week show an inline empty state when their active period has no data.
- Month/Quarter/Year remove empty period blocks before layout.
- Nested week columns with no data are removed before layout.
- ChartBlock only renders categories whose count is greater than zero in that period.
- Removed historical week placeholder cells from the rendered hierarchy.
- Period shells no longer use colored backgrounds / rounded wrappers around other chart surfaces.
- Year -> quarter -> month -> week hierarchy uses incremental indentation and subtle left guide lines.
- After empty groups are removed, remaining period blocks flow compactly instead of reserving their old fixed empty cells.
- Statistics top controls are also flattened to a separator boundary instead of a surface card.

## Governance

Added `scripts/gates/checks/list-hierarchy-convergence-gate.mjs` and wired it into `gate:ui-runtime`.

It prevents regressions where:

- zero-item GroupedContainer nodes are rendered,
- BlockView returns to nested bordered surfaces,
- Statistics stops filtering empty period groups,
- Statistics charts reintroduce zero-count category placeholders,
- period hierarchy loses its indentation/guide-line visual contract.

## Validation

`npm run gate`:

- 8 aggregate gate groups: PASS
- 35 referenced internal checks: PASS
- `list-hierarchy-convergence-gate`: PASS

Changed TS/TSX files were also checked with the installed TypeScript compiler through `transpileModule`; all passed syntax transpilation.

Full Jest/typecheck were not claimed because this copied source package does not contain installed project `node_modules` / Jest binaries.
