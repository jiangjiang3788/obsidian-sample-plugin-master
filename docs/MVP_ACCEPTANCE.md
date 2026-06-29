# MVP_ACCEPTANCE

## MVP user journey

The MVP user journey covers creating records from QuickInput, editing existing records, reviewing business views, and shipping a clean release bundle.

## Acceptance notes

- The release path keeps a bundle budget and is checked by `bundle:gate` / `bundle:report`.
- AI HTTP calls use the Obsidian requestUrl platform transport instead of browser-only APIs.
- QuickInput single-select options must stay visible as option pills rather than hidden dropdown-only controls.
- Record conflict recovery actions must be available inside the modal so users can retry, overwrite, or inspect conflicts.
- Runtime icons come from `@shared/ui/icons`.
- `@mui/icons-material` remains banned from runtime code.

## Gate chain

MVP acceptance includes single-user convergence checks and the final docs gates: final-convergence:gate, docs-governance:gate, any-budget:gate.
