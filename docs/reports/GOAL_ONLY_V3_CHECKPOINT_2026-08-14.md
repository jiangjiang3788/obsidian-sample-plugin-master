# Goal-only V3 checkpoint

Date: 2026-08-14

## Scope

V3 is a source/domain convergence release. V2 already converted the persisted vault and settings into the target Goal-only storage shape, so V3 deliberately does **not** rewrite the 9,437 records again.

The main V3 objective is to remove the old `Goal + Theme + template variant` model from the active GoalTemplate / QuickInput / AI template-resolution path and make the runtime match the already-converted V2 data contract:

- Goal identity: one canonical slash path.
- One Goal path x CoreBlock: at most one GoalTemplate.
- No active GoalTemplate variants.
- No Theme field/default inside GoalTemplate.
- QuickInput chooses Goal, not Theme or template variant.

## Completed in V3

### P7 - template uniqueness

- `GoalTemplateStorageRow` is keyed by `goalPath + coreBlockId`.
- Runtime template IDs are derived, not persisted identities.
- `findGoalTemplate()` resolves the nearest enabled Goal template from leaf to parent.
- Duplicate `goalPath::coreBlockId` rows are rejected by Goal invariants.
- V2/V3 converted settings contain 166 templates and 166 unique Goal x CoreBlock cells; duplicate cells: 0.

### P8 - GoalTemplate editor without Theme / variants

- Matrix renders one template cell instead of a list of preset variants.
- Removed variant context menu and variant drag/copy model.
- Removed GoalTemplate Theme model.
- Editor modes are now: default / custom / hidden.
- GoalTemplate only owns fields, defaults, output location, required fields, and optional period policy. It does not persist Goal/Theme context fields.

### QuickInput convergence

- Removed template variant selection state and UI.
- Initial selection uses Goal path only.
- Goal template lookup uses Goal path.
- Task display-template normalization strips Theme-context fields.

### AI convergence (partial P10)

- AI Goal snapshot uses Goal paths.
- AI GoalTemplate snapshot contains one Goal path x Block template, no variant identity.
- AI normalization resolves Goal + one template by path.
- AI prompt contract no longer asks the model for Theme or template variants.
- Batch confirmation resolves the Goal/template from Goal path.
- A compatibility `themes: []` surface remains in the broader AI API and is scheduled for removal with P10/P11.

### Heatmap/create convergence (partial P9)

- Removed template variant identity from Heatmap create/runtime requests.
- GoalTemplate lookup uses Goal path.
- Theme-named view bridge fields still exist elsewhere and remain a P9/P11 task.

## Validation actually performed in this environment

- `git diff --check`: PASS.
- TypeScript `transpileModule` syntax check: 63 changed TS/TSX files, 0 syntax errors.
- `npm run gate:goal-only`: PASS.
- `npm run gate:records`: PASS.
- `npm run gate:energy`: PASS.
- Full TypeScript project check is **not available** in this environment because local dependency/type packages are incomplete (`node`, `preact`, `vite/client` type definitions are missing).
- Full Jest/Vite build is therefore not claimed here. Run the local verification sequence before treating V3 as build-ready.

## Drift metrics after V3

These counts are intentional progress metrics, not completion claims:

- Active/source files matching Theme-era names (`themePath|themePaths|rootTheme|leafTheme|ThemeDefinition|ThemeManager`): 94.
- Source files matching `goalId|目标ID`: 45.
- Source files matching variant-era names (`variantId|templateVariant|预设变体`): 5. Active GoalTemplate variant behavior has been removed; remaining hits are mainly forbidden legacy-key cleanup/comments.
- Files still under `src/core/theme`: 12.

The next release should make Theme/goalId counts fall, never rise.

## Checkpoint plan

| Phase | Objective | V3 status | Gate / acceptance |
|---|---|---|---|
| P0 | Freeze data baseline | DONE | 9,437 records; known counts recorded |
| P1 | Record stores one Goal path | DONE | no persisted `目标ID`, `主题`, `记录版本` |
| P2 | Direct data conversion | DONE | no unassigned records; Session refs preserved |
| P3 | Correct Chinese archive filenames | DONE | no `#Uxxxx` names |
| P4 | Goal tree UI/order | DONE (stage 1) | root-first tree ordering/default root-only overview |
| P5 | Multi-view performance | NEEDS RUNTIME VERIFY | offscreen views should not all calculate at page open |
| P6 | Statistics root Goal | DONE | child paths roll into root overview |
| P7 | One Goal x RecordType template | DONE V3 | no duplicate Goal x CoreBlock template cell |
| P8 | GoalTemplate editor removes Theme/variants | DONE V3 | default/custom/hidden only |
| P9 | All views Goal-only | PARTIAL | no Theme identity in Timeline/Heatmap/Table/Block/EventTimeline contracts |
| P10 | Energy / AI / Retrieval Goal-only | PARTIAL, advanced V3 | no Theme identity in learning/retrieval/AI public contract |
| P11 | Delete Theme subsystem | TODO | business source Theme references = 0; delete `src/core/theme` |
| P12 | Delete runtime goalId dual identity | TODO | one Goal path through RecordEntity/view/runtime |
| P13 | Delete compatibility/version layers | TODO | current-only code path |
| P14 | Final test/build/performance/data audit | TODO | unit 0 failed; typecheck/build pass; runtime canaries pass |
| P15 | Semantic Goal-tree beautification | LATER | separate from architecture migration |

## Local verification order

Run in the plugin root:

```bash
npm ci
npm run typecheck
npm run gate:goal-only
npm run gate:records
npm run gate:energy
npm run test:unit
npm run build
```

If any command fails, keep the complete output. Do not continue to P11/P12 based only on a successful Vite build.

## Next V4 priority

1. Remove Theme semantics from FieldRegistry / view field catalog / template field adapters / field value resolver.
2. Remove the runtime `goalId = goalPath` bridge from RecordEntity, Markdown parse projections and RecordNormalizer.
3. Replace Theme-named bridge fields in Statistics/Heatmap/Block/EventTimeline with Goal-path semantics.
4. Remove Theme from Energy learning/effect projections.
5. Delete the now-unreferenced `src/core/theme` subsystem.

This order prevents deleting the Theme module first and then reintroducing ad-hoc compatibility helpers across views.
