# Goal-only V1 Checkpoint — 2026-08-14

## Fixed target

This checkpoint follows one intentionally small persistence model:

- Record ownership is persisted only as `目标:: <full/path>`.
- The Goal path is both identity and human-readable hierarchy.
- Persisted Record data has no `目标ID`, `主题`, or `记录版本`.
- Persisted settings has no `schemaVersion`, Theme tree, Goal ID, or template variant ID.
- One Goal path × one CoreBlock has at most one GoalTemplate.
- The lossless first conversion keeps the old Theme suffix under the old Goal, e.g. `照顾好自己 + 健康/睡眠 -> 照顾好自己/健康/睡眠`.

## V1 delivery status

| Step | Scope | Status | Verification / stop condition |
|---|---|---|---|
| 0 | Freeze baseline and count records | DONE | Direct audit records 9437 blocks; core-block counts captured in `data-audit-v1.json`. |
| 1 | Persist Goal path as the single identity | DONE for persistence/runtime adapter | Settings persistence writes `path`; Record persistence writes only `目标`. `gate:goal-only` + `gate:records` pass. |
| 2 | Directly convert the user's vault | DONE | 9437/9437 Records retained; 0 missing Goal; 0 `目标ID`; 0 `主题`; 0 `记录版本`. |
| 3 | Directly convert settings/templates | DONE | 72 Goal paths; 166 templates; 166 unique Goal × CoreBlock cells; no variant collision; forbidden settings keys audit = 0. |
| 4 | QuickInput create flow | DONE for Task/current capture | Goal selector uses one Goal path; Theme selector removed; Task template variants hidden; Task time/duration work retained. |
| 5 | Edit/backfill boundary | DONE for canonical record edit | Edit initialization restores Goal path; dashboard views resolve the canonical Record by record id instead of editing a Timeline projection. |
| 6 | Timeline | DONE for current Task path + manual Task time range | Manual Task start/end ranges and TaskSession priority behavior retained; canonical edit path used. |
| 7 | Heatmap | DONE at config/model/editor boundary | `goalPaths` replaces `themePaths`; editor scans Goal paths. Some downstream local symbol names still say `theme` as a temporary UI bridge. |
| 8 | Generic view settings | PARTIAL | Common filters no longer inject Goal ID / Theme duplicates; converted user view configs are Goal-only. Exhaustive runtime symbol cleanup is pending. |
| 9 | Statistics / Progress | PARTIAL | Persisted converted configs use Goal fields. Several view runtime files still contain historical Theme terminology and must be converged before final Theme deletion. |
| 10 | Energy | DONE for new capture/default Goal; PARTIAL for learning internals | Energy writer/capture/default uses Goal path only. Historical learning/display internals still contain Theme-era types. |
| 11 | AI retrieval/settings | PARTIAL-DONE | AI settings no longer expose default Theme; chat retrieval indexes/filters Goal path. Natural-language parser snapshot/target types still carry Theme-era bridge fields and are pending. |
| 12 | GoalTemplate settings editor | PENDING high-risk refactor | Runtime data is one Goal × CoreBlock, but the old matrix/editor still has Theme/variant-era model code. Do not treat that editor as final V1 architecture. |
| 13 | Delete Theme subsystem / bridge types | PENDING | `src/core/theme`, Theme metadata components, `goalId/themePath` runtime aliases and old view symbols still exist. Final gate will require zero business references. |
| 14 | Goal rename/move rewrite transaction | PENDING | V1 deliberately blocks path rename/move rather than partially rewriting the vault. Add an all-reference transaction before enabling it. |
| 15 | Full compile/unit/build | BLOCKED in this environment | No installed project dependencies (`jest`/`vite` missing). Only syntax transpile + static gates were run here. Run the commands in `docs/GOAL_ONLY_V1_VERIFICATION.md` locally before installing over live plugin data. |

## Direct converted data audit

- Total Record blocks: 9437
- Task: 4304
- TaskSession: 2263
- Habit: 1613
- Thought: 340
- Evidence: 341
- Plan: 234
- Review: 253
- TaskSeries: 87
- Energy: 2
- Record blocks without `目标`: 0
- Record blocks with `目标ID`: 0
- Record blocks with `主题`: 0
- Record blocks with `记录版本`: 0
- Explicit `记录版本::` / `目标ID::` / `主题::` field markers anywhere in the converted vault: 0
- Broken TaskSession → Task references: 0
- Converted settings contains 0 Theme-era key hits and 0 literal `主题` occurrences in template metadata.
- One broken TaskSeries `当前任务ID` remains and is confirmed to already exist in the original vault: `taskseries.01KZQ1WW0096T7TJ47Y00916JP -> task.01KZQ1WW00QMBSGRTPT8Y3ETVB`.

## Important boundary

This is a source/data checkpoint, not the final Theme=0 source and not a compiled release bundle. The high-risk remaining work is intentionally visible rather than hidden behind broad text replacement.
