# Think OS UI Settings Structural Correction 1.0.48

## Why this release exists

1.0.47 removed several explanations and flattened some section/card styles, but representative Settings screens still retained the old structural language because FormField, FieldManager, Layout controls and RuleBuilder were largely unchanged. Phase 5 was therefore marked complete too early.

## 1.0.48 corrective scope

- Dashboard toolbar: restore a framed period selector and frame date/navigation/calendar/settings actions consistently; keep shadows disabled.
- Layout Settings: replace radio rows with compact segmented controls, move layout name into the same label/control row system, tighten layout item spacing, simplify included-view controls.
- View Settings: replace inline-styled FormField rows with compact shared rows; remove duplicate "视图筛选 -> 常用筛选" hierarchy; compact section rhythm and footer actions.
- FieldManager: remove inline card-like styling and use one compact tag/select language.
- Global Data Filter: reduce dialog size, remove duplicate instructional headings, compact common filters, simplify Advanced Filter empty state.
- RuleBuilder: remove persistent instructional prose and nested empty card; add embedded mode so surrounding sections own the heading.

## Phase status

Phase 5 remains IN PROGRESS. Phase 6 must not start until the representative Settings screenshots are visually accepted.
