# Think OS documentation

Active product/design truth:

- `ARCHITECTURE.md` - current module boundaries and dependency direction.
- `RECORD_MODEL.md` - canonical Record, Template and Field semantics.
- `TESTING_RELEASE.md` - local verification, CI and release checks.
- `CSS_DESIGN_SPEC.md` - current UI/CSS design contract.
- `UI_REDESIGN_PLAN.md` - full UI redesign phases and current progress.
- `DEVELOPMENT_GUARDRAILS.md` - rules that prevent architecture from expanding again.
- `DOCUMENT_GOVERNANCE.md` - documentation retention policy.

Implementation history lives under `docs/reports/`. No phase report should be placed loose in the project root.

## Product acceptance contracts

Quick input renders single-select options as product labels while persisting canonical values. Template-backed Record creation requires an enabled direct GoalTemplate for the selected `recordTypeId + goalPath`; ancestor Goals are navigation only, and the runtime never guesses another target or RecordType.

Release verification is intentionally reproducible: run `npm run verify:ci` for the full checks and `npm run build:release` for the release bundle/package boundary.
