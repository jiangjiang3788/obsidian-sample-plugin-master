# Task form UI refinement - 2026-08-14

This refinement continues the task-capture system rework at the source layer. It does not patch compiled `main.js` output.

## Final task capture layout policy

Task quick input uses one primary sequence:

1. Goal (context row)
2. Status
3. Content
4. Recurrence
5. Start / expected time
6. End time
7. Advanced options card (collapsed by default)

The task form no longer renders a divider between Goal and the task primary fields. Start/end time are always primary and never hidden inside Advanced options.

## Status policy

The task capture UI exposes only:

- `open` -> 未完成
- `done` -> 已完成

The record schema still understands historical `cancelled` / `skipped` values. This change only narrows the creation UI; it does not remove compatibility from persistence or parsing.

## Single-select default policy

For task capture, selectable fields default to their first option. Core values therefore default to:

- Status -> 未完成
- Recurrence -> 不重复

The same first-option policy is applied to task advanced single-select fields.

## Advanced options presentation

All remaining optional task fields are placed in one `ThinkDisclosure` card:

- collapsed on initial render;
- card title begins at the left edge;
- no separator line is used to split the card from the primary form;
- the card owns its own surface/border/radius styling.

## Source-level responsibilities

- `model/displayTemplate.ts` owns task field normalization and input defaults.
- `components/Fields.tsx` owns primary/recurrence-detail/advanced layout classification.
- `QuickInputEditorView.tsx` owns context-to-form composition and suppresses the context divider for Task.
- `quick-input-editor.css` owns the card presentation only; it does not decide field semantics.

## Validation in this environment

- TypeScript syntax transpilation passed for modified TS/TSX files.
- Record gate passed.
- Energy gate passed.
- UI runtime gate reaches the repository's pre-existing CSS line-budget failure (`8969 > 8500`); the supplied baseline already documents this governance failure.
- Full `npm ci` / Vite build could not be completed because npm registry access timed out in this environment.
