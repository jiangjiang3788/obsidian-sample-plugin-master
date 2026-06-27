# Think OS CSS V4 Notes

## Apply order

Apply after Freeform V1-V4 and CSS V1-V3. Extract this incremental package to the project root and overwrite matching paths.

## Scope

CSS V4 converges the runtime business views and shared module shell:

- ModulePanel / View toolbar / Freeform shell
- Progress
- Heatmap
- Statistics
- Timeline
- Excel
- Block
- Event Timeline

## Main changes

- Migrated seven legacy business CSS files into governed `src/styles/features/*` files.
- Reduced the legacy files to compatibility stubs; no source file deletion is required in V4.
- Extracted the Excel section from `base.css` into `features/excel.css`, reducing `base.css` from 884 to 322 lines.
- Rebuilt Progress styling around semantic classes and tokens; fixed visual `style={{...}}` blocks were removed.
- Replaced ModulePanel MUI `IconButton`/`sx` usage with `ThinkIconButton`.
- Added container-query boundaries to shared and business view roots.
- Unified surfaces, borders, radius, focus, empty states and responsive behavior across List/Grid/Freeform.
- Kept only runtime geometry or data-driven colors inline.
- Added CSS V4 contracts to the CSS Boundary Gate and five governance tests.

## Audit delta

| Metric | CSS V3 | CSS V4 | Delta |
|---|---:|---:|---:|
| `sx` occurrences | 262 | 255 | -7 |
| `style` occurrences | 148 | 115 | -33 |
| `!important` | 72 | 59 | -13 |
| hardcoded colors outside tokens | 68 | 17 | -51 |
| plugin unprefixed classes | 190 | 161 | -29 |
| CSS variable references | 1,062 | 1,326 | +264 |
| `base.css` lines | 884 | 322 | -562 |

CSS total lines temporarily increase because V4 retains compatibility stub imports and adds the governed Feature layer. CSS V5 removes the legacy imports/stubs and applies final bundle budgets.

## Validation

- Vite production build: passed, 1,526 modules transformed.
- CSS V3 + V4 governance tests: 9/9 passed.
- CSS Boundary Gate: passed.
- Public/Core/Architecture/Feature/Shared Runtime gates: passed.
- Settings persistence, DataStore, Performance and Freeform gates: passed.
- Full source typecheck still reports pre-existing repository errors; no changed V4 file appears in the error list.

## Remaining CSS V5

- Remove compatibility imports and obsolete stub files.
- Converge `base.css`, `modals.css`, `components.css`, `utilities.css`, timer and task-execution leftovers.
- Remove remaining ordinary-component `!important` and hardcoded UI colors.
- Add final CSS size budgets and visual regression matrix.
