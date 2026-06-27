# Think OS CSS V5 Final Notes

## Delivery type

CSS V5 deletes legacy styles, so this release is delivered as a full project package rather than an incremental overlay.

## Final convergence

- Deleted every `.css` file under `src/shared/styles`; only `mui-theme.ts` remains.
- Removed all legacy stylesheet imports from `src/styles/main.css`.
- Migrated Task Execution into `src/styles/features/task-execution.css`.
- Migrated Task Row and table-cell alignment into `src/styles/components/task-row.css`.
- Migrated Block/Event grouped hierarchy into `src/styles/components/grouped-container.css`.
- Migrated Quick Input host geometry into `src/styles/overrides/quick-input-modal.css`.
- Moved recurrence colors into the data-token palette.
- Removed fixed inline skin from `TaskRow`.
- Renamed Quick Input keyboard state classes and table-cell class into governed namespaces.
- Added final CSS budgets, V5 contracts, visual-regression matrix and architecture documentation.

## Final audit

| Metric | CSS V4 | CSS V5 | Change |
|---|---:|---:|---:|
| CSS files | 47 | 36 | -11 |
| CSS source lines | 7,416 | 6,905 | -511 |
| `!important` | 59 | 9 | -50 |
| Hardcoded colors outside tokens | 17 | 0 | -17 |
| Governed/unprefixed violations | 161 | 0 | -161 |
| Duplicate classes across files | 25 | 21 | -4 |
| `sx={...}` | 255 | 255 | unchanged ceiling |
| `style={...}` | 115 | 114 | -1 |

## Reviewed exceptions

Nine `!important` declarations remain in `quick-input-modal.css`. They are restricted to Obsidian modal shell geometry (`position`, `inset`, size, margin and transform) and are explicitly allowlisted. Ordinary components and business views contain none.

## Verification

- Production build: passed (1526 modules).
- CSS V3/V4/V5 governance tests: 15/15 passed.
- CSS Boundary Gate: passed.
- Public/Core/Architecture/Feature/Shared Runtime gates: passed.
- Settings persistence, DataStore, performance, icon and freeform gates: passed.
- Hardcoded UI colors outside token files: zero.

## Manual visual review

Automated contracts cannot reproduce Obsidian community themes or mobile keyboard geometry. Use `docs/CSS_VISUAL_REGRESSION.md` to capture and approve the final Light/Dark/community-theme matrix in a real Obsidian runtime.
