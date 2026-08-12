# ProgressView list-system final convergence · 2026-08-12

## UX contract

ProgressView keeps the existing view/runtime contract. It does not create an internal time-period system, toolbar, filter axis or new ViewType.

Hierarchy:

- Goal: growth summary only
- Theme: growth unit and expandable row
- Record: evidence belonging to the selected theme

## Final UI changes

1. Removed card/white-panel presentation from goal rows and theme rows.
2. Removed Goal-level Task/Habit/etc summary chips from the runtime UI.
3. Theme expansion now reuses the same record rendering chain used by Statistics:
   - `BlockView`
   - task records -> `TaskRow`
   - other records -> `BlockItem`
4. Progress-specific CSS only strips BlockView container/card skin inside theme records; it does not replace TaskRow semantics.
5. Goal and theme rows use thin separators and transparent backgrounds.
6. Narrow screens prioritize one-line rows by reducing spacing and low-priority text before wrapping.

## Date normalization

Progress record date normalization now accepts:

- ISO/date strings
- Date objects
- epoch seconds (10-digit style values)
- epoch milliseconds (13-digit style values)

Numeric timestamps are normalized to `YYYY-MM-DD` instead of exposing raw numbers such as `1786458278`.

## Main files

- `src/features/views/runtime/ProgressView.tsx`
- `src/features/views/runtime/ProgressGoalCard.tsx`
- `src/features/views/runtime/ProgressViewModel.ts`
- `src/styles/features/progress.css`
- `test/unit/progressViewModel.test.ts`
- `test/unit/cssGovernance.test.ts`

## Verification

Passed project aggregate gates after final changes:

- architecture
- product
- records
- task-session
- energy
- ui-runtime
- quality
- stability

The current container does not have the complete npm dependency tree, so full Jest/TypeScript execution is not claimed here.
