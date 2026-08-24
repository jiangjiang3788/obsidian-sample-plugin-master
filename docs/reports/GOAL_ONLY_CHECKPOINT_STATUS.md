# Goal-only migration checkpoint status — V10

| Phase | Goal | Status after V10 | Acceptance check |
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
| P9 | Make views Goal-only | Complete main runtime | Timeline / Heatmap / Progress / Statistics have no second classification identity |
| P10 | Make Energy/AI/Retrieval Goal-only | Complete main runtime | Energy/AI/Retrieval use the same Goal path |
| P11 | Delete obsolete Theme subsystem | Complete | Theme domain/runtime files are physically absent |
| P12 | Collapse Goal runtime identity itself to one property | Complete | `GoalDefinition.path` is identity; no id/title/goalPath/parent mirror |
| P13 | Current-only Record / Settings runtime | Complete | No historical user-data compatibility model in main Record persistence |
| P14 | Full integration / build / performance acceptance | 🟡 **V10 pass 3** | Latest `typecheck:test` reports 5 errors in 2 test fixtures; V10 fixes only those fixture types and leaves runtime contracts unchanged |
| P15 | Semantic Goal-tree simplification | Later | Only after P14; decide whether paths such as `照顾好自己/健康/睡眠` should be simplified |

## V10 P14 pass 3 boundary

No domain redesign is allowed here. V10 only closes test-fixture TypeScript drift after V9; product runtime code is unchanged.

Current view semantics remain explicit:

- Statistics = root Goal overview.
- Progress = root Goal card + child Goal skill rows.
- Timeline / Table / edit context = canonical full Goal path.
- Record edit resolves from `coreBlock` + current Goal/template settings, not persisted template provenance.
