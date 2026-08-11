# Think OS Energy 1.0.12 status

## Completed scope

1.0.12 implements the desktop Energy quick-capture path inside the existing QuickInput surface.

- `core.energy` appears in the existing record-type switcher.
- Energy remains a Goal-bound Direct Record Type and never resolves a GoalTemplate.
- Quick capture points are exactly `0 / 20 / 40 / 60 / 80 / 100`.
- Persisted truth remains one `0-100` score field.
- When the QuickInput session already has a goal, Energy keeps that goal context.
- When there is no goal context, the first non-archived goal is automatically selected; the user may change it before capture.
- Clicking a score writes immediately and closes the modal after success. There is no second Save click.
- Direct records append to `01/目标精力.md` under `## <goalPath>`.
- Desktop source is stored as `来源:: desktop-panel`.
- The ordinary template create/update path is unchanged.

## Direct record example

```text
<!-- start -->
核心Block:: energy
记录子类型:: snapshot
目标ID:: goal.我若安好便是晴天
目标:: 我若安好便是晴天
分类:: 精力
日期:: 2026-08-10
时间:: 15:42
主题:: 生活
精力值:: 80
精力档位:: 80
评分模式:: quick
记录方式:: realtime
时间精度:: exact
来源:: desktop-panel
<!-- end -->
```

## Architecture changes

- Added `InputService.appendDirectRecord(...)` as the common non-template persistence primitive.
- Added `RecordInputUseCase.submitEnergySnapshot(...)` to keep feature UI behind the application UseCase boundary.
- Registered `@core/recordTypes/public` and `@core/energy/public` as module public facades instead of expanding root `@core/public`.
- Kept `QuickInputEditorContainer.tsx` below the locked refactor size budget.

## Verification completed

Passed in this environment:

- `version:gate`
- `manifest:gate`
- `arch:gate`
- `arch:public`
- `arch:capabilities`
- `feature:gate`
- `di:gate`
- `core-public:gate`
- `core-obsidian:gate`
- `domain:gate`
- `schema:gate`
- `css-boundary:gate`
- `data-store:gate`
- `events-boundary:gate`
- `modal-promise:gate`
- `selector-giant-subscription:gate`
- `shared-runtime:gate`
- `refactor:budget`
- TypeScript syntax transpile check on changed files
- Energy Markdown + header append smoke test

Full TypeScript typecheck cannot start because the uploaded source archive has no `node_modules`; the compiler reports only missing type packages (`node`, `preact`, `vite/client`) before project checking begins.

The following release/convergence gates are also blocked by files missing or encoded in the uploaded source package, not by 1.0.12 Energy changes:

- `mvp:gate`: `.github/workflows/ci.yml` is absent from the uploaded archive.
- `single-user:gate` / `final-convergence:gate`: historical docs are present with `#Uxxxx` encoded filenames instead of the Chinese filenames those gates expect.

## Deliberately not included

- detailed arbitrary 0-100 input UI
- Energy record editing
- retrospective capture
- Apple Shortcuts / Widget
- default-energy-goal setting UI
- Goal detail Energy section
- Task / Timer / Habit context association
- Energy timeline or analytics

Those stay in later versions so 1.0.12 has one acceptance behavior only.
