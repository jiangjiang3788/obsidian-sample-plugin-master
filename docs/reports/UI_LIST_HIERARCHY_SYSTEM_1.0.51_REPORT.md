# Think OS 1.0.51 - List / hierarchy system convergence

## Scope

Phase 6 converges Block, Progress and Energy task/list families at both visual and code ownership levels.

## Main changes

- Expanded `src/styles/components/task-row.css` into the shared owner for list row height, divider, hover, selected state, metadata rhythm and hierarchy guide tokens.
- BlockView and BlockItem consume the shared list contract.
- Block narrow behavior no longer uses `ResizeObserver`; CSS container queries own the layout switch.
- TaskRow has an explicit `listRow` mode. Block/Progress use it; Table/EventTimeline keep their inline rendering and are not restyled prematurely.
- Shared field pill styling moved out of Block feature CSS because shared `TagsRenderer` also consumes it.
- Progress goal/theme rows share list density and use ThinkIcon chevrons.
- Energy recommendation rows share list behavior; Energy context selection uses `SimpleSelect` rather than feature-owned native select skin.
- Task timer actions now use `ThinkIconButton` + `ThinkIcon` directly instead of the legacy MUI-backed `IconAction` wrapper.
- Existing flat hierarchy semantics are preserved: parent row + indentation + guide line, no nested cards.

## Governance

The existing list hierarchy gate now also verifies the shared list-system contract, Block CSS-container behavior, contextual TaskRow list mode, Progress shared row usage, Energy shared controls and timer action primitive ownership.

## Next

Phase 7: Table / Excel / Heatmap grid and data-view convergence.

## Validation

- Architecture gate: PASS
- Records gate: PASS
- Task-session gate: PASS
- Energy gate: PASS
- Quality gate: PASS
- List hierarchy convergence gate: PASS
- Changed TS/TSX syntax transpilation: PASS
- CSS audit: 72 files / 9245 lines; no hardcoded UI colors outside tokens
- UI runtime aggregate: blocked only by the pre-existing CSS line budget (9245 / 8500)
- Product / Stability aggregate: blocked by the source package missing `.github/workflows/ci.yml`
- Full TypeScript typecheck is not claimed because this source copy has no local `node`, `preact`, or `vite/client` type packages installed.
