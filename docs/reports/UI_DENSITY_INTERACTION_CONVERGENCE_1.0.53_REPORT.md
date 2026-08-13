# Think OS 1.0.53 - Density and interaction convergence

## Why this release exists

User review found four consistency problems after 1.0.52: Block/Table task rows became too tall after dividers were removed; task checkboxes drifted vertically; Energy separators felt like tall hairlines instead of text rhythm; advanced filter rules still used a disclosure + panel interaction while sorting used a compact add row.

## Changes

- Block task rows now opt into the shared compact TaskRow mode.
- Shared TaskRow owns checkbox margin and first-line alignment; feature CSS no longer needs per-view checkbox offsets.
- Runtime Table has an explicit `think-table--matrix` density class so its cells can be tightened without changing Excel.
- Energy goal groups remove repeated full-width separators and use text `|` separators between tasks.
- Global and per-view advanced filters are always visible.
- Advanced filters now use the same compact RuleBuilder interaction as sorting.
- Quick filters and advanced filters are split before editing so quick `in` filters do not reappear in the advanced editor.

## Scope

This is a corrective release across Phase 5 and Phase 6. Phase 7 Grid/Data remains the next formal phase.
