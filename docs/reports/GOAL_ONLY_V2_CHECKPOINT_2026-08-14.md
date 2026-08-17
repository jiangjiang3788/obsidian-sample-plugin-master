# Goal-only V2 checkpoint — 2026-08-14

## Scope of this checkpoint

V2 deliberately targets four user-visible regressions before continuing the deeper Theme/Goal domain deletion:

1. A layout with many expanded views repeatedly executes expensive view queries and can freeze the page.
2. Statistics should aggregate at root Goal level instead of expanding every leaf Goal.
3. Goal preset matrix should start at root Goals, keep descendants under their parent, and not paint a visible “添加” control in every empty cell.
4. The V1 converted vault used escaped `#Uxxxx` filenames; V2 must ship real UTF-8 Chinese filenames.

This checkpoint does **not** claim the internal Theme/variant bridge has been fully deleted. That is a later gate.

## Changes completed in V2

### Dashboard performance — first pass

- Added `ViewportDeferredView`: an expanded view mounts its heavy `ViewContent` only when it is within 320px of the viewport.
- Removed timed “render all expanded views in batches” behavior. That behavior eventually mounted every heavy view even when it was far below the viewport and also caused repeated parent rerenders.
- Added shared date-selection caching in `RecordQuery` keyed by immutable source-array identity + date policy, with a bounded 48-entry cache per snapshot.
- Removed the duplicate initial `dataStore.queryItems()` call from `useLayoutItems`; the state initializer performs the first query and the subscription only refreshes on actual DataStore changes.

Expected effect: a layout may contain many expanded modules, but off-screen modules remain lightweight placeholders and sibling views reuse the expensive date scan. This must still be benchmarked in the user's real Obsidian runtime.

### Statistics — root Goal overview

- Statistics now resolves the root segment of the canonical Goal path.
- `照顾好自己/健康/睡眠` and `照顾好自己/健康/身体` both roll up to `照顾好自己` in Statistics.
- Removed the Statistics Goal/Theme summary strip so the overview no longer reintroduces Theme as a secondary dimension.

### Goal preset matrix

- Root Goals only by default; descendants appear only after expanding a branch.
- Goal order is hierarchical depth-first. Children cannot float above their parent merely because their numeric `sortOrder` is smaller.
- Removed the redundant second row-collapse state/chevron.
- Toolbar explicitly switches between `全部展开` and `只看根目标`.
- Empty Goal × Block cells are visually blank. A subtle `+` appears only on hover/focus and the cell remains clickable/keyboard accessible.
- Generated/default preset cards display `已配置` rather than repeated generated names such as `记录预设`.

Important remaining debt: the editor/copy implementation still contains old Theme/variant helper types internally. V2 fixes the matrix behavior and display but does not pretend that subsystem has already been deleted.

### Converted vault filenames

The V2 data archive contains real UTF-8 names:

- `2-0其他.md`
- `2-1健康.md`
- `2-2三餐.md`
- `2-3生活.md`
- `2-4思考.md`
- `2-5电脑.md`
- `2-6工作.md`
- `总结.md`
- `打卡.md`
- `白板.canvas`
- `目标.md`
- `目标事件.md`
- `目标打卡.md`
- `目标精力.md`
- `计划.md`
- `记录.md`
- `闪念.md`

The inner ZIP entries use the UTF-8 filename flag. Record content is copied from the V1 Goal-only converted vault without another semantic rewrite.

## Verification performed in this environment

Passed:

- TypeScript `transpileModule` syntax check for every changed TS/TSX file.
- `node scripts/gates/goal-only-gate.mjs`
- `node scripts/gates/records-gate.mjs`
- `node scripts/gates/energy-gate.mjs`
- Converted data audit: 9437 Record blocks; 0 `目标ID::`; 0 `主题::`; 0 `记录版本::`.
- V2 archive audit: 17 files, no `#Uxxxx` escaped filenames, UTF-8 flags present.

Not run successfully here:

- `npm ci`
- full Jest unit suite
- full TypeScript project typecheck
- Vite production build

Reason: npm registry DNS resolution failed (`EAI_AGAIN`) for both public/mirror package hosts. Therefore this checkpoint is a **source/data delivery**, not a claimed production build.

## Next gate

The next architecture gate is **GoalTemplate single-template convergence**:

- one Goal path × one CoreBlock = at most one template;
- remove copy-as-variant UI/behavior;
- remove Theme selector/default propagation from the GoalTemplate editor;
- remove variant identity from GoalTemplate runtime/storage adapters;
- add a hard invariant/gate that rejects duplicate Goal × Block templates.

Only after that passes should the remaining View/AI/Energy Theme bridges be removed.
