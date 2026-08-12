# Think OS 1.0.42 - Ctrl/⌘ Origin Navigation Convergence

Date: 2026-08-12

## Goal

Make `Ctrl/⌘ + click -> open backing Markdown origin` available anywhere a view interaction can unambiguously identify a single Record, while preserving each view's normal primary click behavior.

This is intentionally not applied to aggregate-only surfaces such as Goal headers, Theme headers, group headers, empty creation cells, or multi-record buckets where no single origin is unambiguous.

## Interaction contract

- Normal click keeps the existing view-specific primary action.
- `Ctrl/⌘ + click` opens the backing Markdown source when exactly one Record is identifiable.
- Shared Record surfaces still keep `double click -> origin` through `createRecordGestureHandlers`.
- Aggregate surfaces keep their aggregate action unless the aggregate contains exactly one Record.
- macOS Command and Windows/Linux Ctrl share the same `hasPlatformModifier()` contract.

## Coverage

### BlockView / TableView / EventTimeline / Progress expanded records

Already-used shared Record surfaces remain the primary contract:

- title/content: `ItemLink` / `BlockItem` / `TaskRow`
- visible field pills now also support modifier-origin navigation
- Task checkbox/timer buttons keep their own task commands and do not steal the modifier-origin contract from the Record title/content surface

### TimelineView

Task blocks already use the shared Record gesture contract. Normal click edits; Ctrl/⌘+click or double click opens origin.

### ExcelView

Fixed an important semantic mismatch from 1.0.41:

- ordinary click: select spreadsheet cell
- double click / Enter / F2: edit cell
- **Ctrl/⌘+click: open the backing Record Markdown origin**

Previously the modifier click called the normal Record editor instead of the origin handler.

### EnergyView

Added origin navigation to every uniquely Record-backed surface:

- task chip: normal click starts/resumes timer; Ctrl/⌘+click opens task origin
- task context-menu edit action: shared Record gesture contract
- task history records: shared Record gesture contract
- sample dots in day/week/month maps: Ctrl/⌘+click opens sample origin
- quarter/year daily aggregate dot: Ctrl/⌘+click opens origin only when that day is backed by exactly one sample
- sample detail “open record” action: shared Record gesture contract
- daily detail record rows: normal click edits; Ctrl/⌘+click / double click opens origin
- “open last record” action: shared Record gesture contract

### HeatmapView

A Heatmap cell can represent zero, one, or many Records, so the rule is deliberately conditional:

- 0 Records: primary click creates
- 1 Record: primary click opens day manager; Ctrl/⌘+click opens that Record origin directly
- 2+ Records: primary click opens manager; modifier click does not guess which Record is intended

The tooltip advertises the modifier-origin action only when the cell has exactly one Record.

### StatisticsView

Statistics is aggregate-first, so modifier-origin is only enabled for unambiguous buckets:

- period/goal bucket with exactly one backing Record: Ctrl/⌘+click opens origin
- bucket with zero or multiple Records: click continues opening the Statistics popover
- records inside the popover continue using BlockView/shared Record gestures

This applies consistently to chart block, number, bar and category label actions because they resolve through the same bucket action.

## Field pills

`FieldPill` now receives `onOpenRecordOrigin`. Theme/category/image/text field pills and the Tags surface can use Ctrl/⌘+click to jump to the Record source. This closes a gap where TaskRow field areas stopped propagation and therefore could not use the parent Record modifier action.

## Governance

`view-interaction-convergence-gate` now protects the stronger contract:

- Energy task modifier action must be origin, not edit.
- Energy sample dots must expose origin navigation.
- Heatmap single-Record cells must expose origin navigation.
- Statistics single-Record buckets must expose origin navigation.
- Excel modifier click must use `onOpenRecordOrigin`.
- visible Record field pills must support modifier-origin navigation.

## Validation

`npm run gate`:

- 8 aggregate gate groups: PASS
- 37 referenced internal checks: PASS
- `view-interaction-convergence`: PASS

All 25 changed TS/TSX files were parsed/transpiled with the installed TypeScript compiler using `transpileModule`: PASS.

`npm run typecheck:src` was also attempted, but this source package does not contain the project type dependencies (`@types/node`, `preact`, `vite/client`), so a full typecheck cannot run in this container. No full typecheck success is claimed.
