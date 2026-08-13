# Quick Input systematic redesign · 2026-08-12

## Goal

Rebuild Quick Input as one predictable form system instead of a stack of unrelated title + control blocks.

The core rule is simple:

> **One piece of information appears once; desktop/tablet rows use one shared left label column and one right interaction column.**

## Information architecture

1. **Header** — operation only: `快速录入 / 编辑记录 / 转换记录类型 / 另存为新记录`.
2. **Context** — `记录类型 / 目标 / 记录预设`.
3. **Content** — template fields such as `内容 / 日期 / 优先级 / 精力要求`.
4. **Footer** — cancel / create / save actions only.

Record type is no longer repeated in the modal title. Goal no longer contains a second `父目标` heading when it is already inside the `目标` row.

## Layout rules

- Shared desktop/tablet label column: **92px**.
- Main row gap: **12px**.
- Label/control horizontal gap: **12px**.
- Labels use secondary text + semibold weight so options remain the visual focus.
- Options wrap inside the right column; the label never jumps above the options at normal modal widths.
- Time/date fields use the same row grammar instead of switching to a separate vertical form grammar.
- Only viewports below **440px** fall back to stacked labels.

## Selection rules

- Selected pill color is already sufficient state feedback.
- Remove helper text such as `当前：高` / `当前：感受`.
- Keep hints only when they explain a real fallback or constraint, not when they repeat visible state.

## Hierarchy rules

- Top-level goal choices live directly in the `目标` row.
- Do not render another `父目标` heading.
- When the selected goal has children, render the child level as a compact horizontal sub-row inside the right column.
- `清空` stays an explicit action pill because it changes state rather than describing state.

## CSS ownership

- `overrides/quick-input-modal.css` owns Obsidian modal geometry and host compatibility.
- `features/quick-input-editor.css` owns Quick Input editor layout and field rhythm.
- This split keeps the CSS architecture within the repository governance budget.
