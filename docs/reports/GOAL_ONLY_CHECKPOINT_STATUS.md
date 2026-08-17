# Goal-only migration checkpoint status

| Phase | Goal | Status after V6 | Acceptance check |
|---|---|---|---|
| P0 | Freeze source/data baseline | Complete | Record and TaskSession baseline numbers recorded |
| P1 | Persist one `目标` value per Record | Complete | Persisted `目标ID/主题/记录版本` are zero |
| P2 | Directly convert the only local dataset | Complete | No unassigned migrated Record; TaskSession references unchanged |
| P3 | Restore real UTF-8 vault filenames | Complete | No `#Uxxxx` filenames |
| P4 | Correct Goal tree ordering/expansion UI | Complete first pass | Roots render before children; matrix starts root-only |
| P5 | Stop multi-view dashboards from eagerly computing every view | User verification pending | Off-screen views do not immediately emit heavy view computation logs |
| P6 | Statistics uses root Goal overview | Complete | Child Goal records roll into one root bucket |
| P7 | One Goal path × CoreBlock has at most one template | Complete | 166 templates = 166 unique cells |
| P8 | Remove template variant/classification UI | Complete | No runtime template variant identity |
| P9 | Make views Goal-only | Complete main runtime | Heatmap/Progress/toolbar/view props use Goal paths; second classification runtime is absent |
| P10 | Make Energy/AI/Retrieval Goal-only | Complete main runtime | Energy/AI/Retrieval use the same Goal path |
| P11 | Delete obsolete classification subsystem | Complete | `src/core/theme` and related Settings/UI/store/use-case paths absent |
| P12 | Collapse Goal runtime identity itself to one property | **Complete in V6** | `GoalDefinition` has `path` plus metadata only; no id/title/goalPath/parentGoalId |
| P13 | Remove remaining historical data-compatibility behavior | Next target | Current data is already current-only; remaining legacy readers/aliases must be audited before deletion |
| P14 | Full build/test/performance/data acceptance | Pending user machine | typecheck 0, unit 0 failed, build 0; P5 real dashboard verified |
| P15 | Semantic Goal-tree cleanup | Later | Only after architecture is stable; then simplify paths such as `照顾好自己/健康/睡眠` |
