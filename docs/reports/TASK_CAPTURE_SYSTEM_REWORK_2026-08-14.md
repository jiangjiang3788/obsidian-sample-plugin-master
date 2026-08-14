# Task Capture System Rework — 2026-08-14

## Final interaction model

Task quick capture primary order is now: **Goal → Status → Content → Recurrence**.

- Theme is not a direct task input. It remains a hidden system-context field resolved from Goal / GoalTemplate, so a template-associated theme still persists without exposing a theme picker.
- Task content is a single-line text input.
- Status defaults to the first option (`未完成`).
- Recurrence defaults to the first option (`不重复`).
- Other task single-select fields use first-option auto selection unless a GoalTemplate explicitly supplies a default.
- Recurrence uses the same shared left-label/right-control row as Goal and all other primary fields.
- Recurrence interval appears only when recurrence is enabled.
- Start/end time, priority, energy/brain/physical demand, availability context and recovery intent are under a collapsed `更多选项` section.
- Start/end time and lifecycle status remain independent: an end time does not itself complete a task.

## Why Goal and Recurrence previously looked like two formats

The old form had two rendering systems:

1. Goal was rendered in the QuickInput **context layer** using a dedicated `ContextRow` component.
2. Recurrence was a **template field** rendered through `QuickInputFieldFrame`.

They happened to use similar two-column CSS, but they did not share the same structural component. This is why spacing, nested fields, and future changes could drift.

The rework introduces one structural primitive, `QuickInputFormRow`, and both context fields and template fields render through it. The two-column form is therefore one layout system instead of two CSS approximations.

## Source-level changes

- `src/core/records/schema/definitions.ts`
  - Task canonical capture fields now define Status / Content / Recurrence as the primary task inputs.
  - Content is `text`, not `textarea`.
  - Theme remains in the schema as hidden system context for GoalTemplate persistence.
  - Task single-select defaults follow the first-option policy.
- `src/core/services/GoalTemplateResolver.ts`
  - GoalTemplate custom field lists can no longer accidentally delete hidden system-context fields such as `themePath`.
  - This preserves template-theme association while removing the theme picker from task capture.
- `src/features/quickinput/editor/model/displayTemplate.ts`
  - Normalizes legacy/custom task templates into the canonical task capture model.
  - Keeps hidden theme context, converts legacy task body fields to single-line text, and ensures Status / Recurrence exist.
- `src/features/quickinput/editor/components/FormRow.tsx`
  - New shared left-label/right-control row used by both context and template fields.
- `src/features/quickinput/editor/QuickInputEditorView.tsx`
  - Context rows now reuse `QuickInputFormRow`.
  - Direct theme-picker props were removed from the view contract.
- `src/features/quickinput/editor/fields/FieldFrame.tsx`
  - Template fields now reuse `QuickInputFormRow` rather than maintaining a parallel row structure.
- `src/features/quickinput/editor/components/Fields.tsx`
  - Task primary fields are explicitly ordered Status → Content → Recurrence.
  - Recurrence interval is conditional.
  - Remaining fields are grouped into a default-collapsed `更多选项` disclosure.
  - System context fields, including Theme, are never rendered as ordinary task inputs.
- `src/styles/features/quick-input-editor.css`
  - One row grid governs both context and field rendering.
  - Added advanced-section disclosure rhythm without introducing another form layout.
- Tests
  - Added task display-template coverage.
  - Added GoalTemplate coverage ensuring template theme context survives when the visible preset field list omits Theme.

## Compatibility

This is not a Markdown migration. Existing task records and existing GoalTemplate data remain readable. The display-template normalization layer accepts legacy task date/time field names, while new task capture uses the simplified UI model.
