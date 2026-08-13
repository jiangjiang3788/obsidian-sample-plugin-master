# Think OS 1.0.40 · Settings / Statistics Convergence

Date: 2026-08-12

## Scope

This release fixes three system-level problems reported from the current UI:

1. Statistics must not collapse zero-data time periods / goal columns into blank space.
2. Field pickers must have one canonical source/category/order contract; repeated “核心字段 / 自定义字段” groups are invalid.
3. Layout → included view rename must work reliably inside Obsidian and persist through the ViewInstance use case.

No vault data migration is required for this release.

---

## 1. Statistics: zero is data, not absence

### Root cause

The previous list-hierarchy convergence incorrectly applied “hide empty groups” to Statistics. That rule is valid for list groups such as BlockView, but invalid for a time comparison chart.

The runtime had four collapsing behaviors:

- `PeriodStatisticsView` removed blocks with `hasPeriodData(...) === false`.
- Nested week/month columns were removed when they contained no records.
- `ChartBlock` removed categories whose count was zero.
- Day / Week views replaced zero-data charts with an empty-state placeholder.

This destroyed the stable comparison frame: a month/week/goal could disappear completely simply because its value was 0.

### New contract

Statistics now treats `0` as an explicit statistical state:

- known Goal buckets are included even when the active period has no records;
- year / quarter / month / week / day time slots remain present;
- every Goal column remains present;
- number cells render `0` explicitly;
- zero-height bars keep a visible baseline;
- original `gridColumn` positions are preserved instead of compacting remaining periods.

This means Statistics maintains a stable time × Goal coordinate system.

### Files

- `src/features/views/runtime/StatisticsView/StatisticsViewModel.ts`
- `src/features/views/runtime/StatisticsView/views/PeriodStatisticsView.tsx`
- `src/features/views/runtime/StatisticsView/views/DayStatisticsView.tsx`
- `src/features/views/runtime/StatisticsView/views/WeekStatisticsView.tsx`
- `src/features/views/runtime/components/statistics/ChartBlock.tsx`
- `src/styles/features/statistics.charts.css`
- `scripts/gates/checks/list-hierarchy-convergence-gate.mjs`

---

## 2. Field picker: one category/source/order contract

### Root cause

`getAvailableFields()` built the correct semantic categories, but then globally sorted every field by localized label.

`FieldManager` / `SimpleSelect` render a group header whenever the adjacent option's `group` changes. A globally label-sorted list therefore produced sequences like:

- 核心字段
- 自定义字段
- 核心字段
- 自定义字段

The data did not actually contain multiple “custom sources”; the UI ordering split the same category into repeated islands.

A second inconsistency also existed: an unknown raw field key was classified as `core` unless it explicitly started with `extra.`.

### New contract

Field picker ordering is now owned by `FieldRegistry`:

1. 核心字段
2. 文件字段
3. 自定义字段

Within built-in fields, order follows the curated `VIEW_FIELD_PICKER_KEYS` product order rather than Chinese alphabetical sorting.

Within custom fields, labels are sorted alphabetically only inside the custom group.

Unknown/unregistered fields default to `custom`, not `core`.

Both `getAvailableFields()` and `getFieldPickerOptions()` use the same ordering contract.

### Files

- `src/core/fields/FieldRegistry.ts`

---

## 3. Layout → View rename: controlled dialog + awaited persistence

### Root cause

The layout editor used browser `prompt()` for renaming a ViewInstance. This interaction is fragile inside Obsidian/floating settings surfaces and is outside the shared UI/persistence pattern.

### New contract

The rename action now opens a controlled Think OS `Modal`:

- current title is prefilled;
- empty names are rejected;
- Enter submits;
- save calls `await useCases.viewInstance.updateView(viewId, { title })`;
- the dialog closes only after the update promise completes.

There is no browser `prompt()` dependency anymore.

### Files

- `src/features/settings/components/LayoutEditorPanel.tsx`

---

## Governance

Added:

- `scripts/gates/checks/settings-field-view-convergence-gate.mjs`

It prevents regressions where:

- field picker ordering leaves the canonical registry;
- unknown fields are allowed to fragment category grouping;
- layout rename returns to `prompt()`;
- Statistics filters zero periods or zero categories again.

`list-hierarchy-convergence-gate` was also corrected: BlockView still removes truly empty list groups, while Statistics must preserve zero-data time/chart structure.

---

## Validation

`npm run gate`:

- 8 aggregate gate groups: PASS
- 36 referenced internal checks: PASS
- `settings-field-view-convergence`: PASS
- `list-hierarchy-convergence`: PASS with zero-data Statistics contract

Changed TS / TSX files were syntax-checked with TypeScript `transpileModule`; all passed.

`npm run build` could not run to completion in this delivery container because the project-local `vite` binary is not installed (`vite: not found`). No full Jest/typecheck claim is made for the same dependency reason.

