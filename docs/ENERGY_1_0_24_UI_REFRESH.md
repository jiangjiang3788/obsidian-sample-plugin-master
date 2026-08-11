# Energy 1.0.24 — EnergyView Visual Refresh

## Goal

Reduce the reading cost of EnergyView without deleting any of the analysis work from 1.0.18–1.0.23.

The default surface now follows this hierarchy:

1. current state summary;
2. weekly visual map;
3. selected-sample detail;
4. three concise insight cards;
5. advanced statistics only when explicitly expanded.

## Weekly map

The primary visualization was redesigned around the requested orientation:

- horizontal axis = date / weekday;
- vertical axis = time of day;
- energy is encoded mainly by point color;
- realtime = solid point;
- retrospective = hollow/dashed point;
- Missing day = visually empty / muted column;
- points are only connected inside the same day;
- no cross-day interpolation and Missing is never treated as zero.

Clicking a point selects it instead of immediately navigating away. The side detail card shows the raw sample and runtime context, with a separate `打开原记录` action.

## Main page hierarchy

The default EnergyView page is intentionally non-BI-like:

- header chips: weekly coverage, latest time, total, brain, physical;
- direct `记录精力` action using `core.energy` and the current Goal context;
- weekly energy map as the dominant visual;
- compact selected-point detail card;
- three short cards: `本周节律`, `恢复 / 消耗`, `管理提示`;
- `高级统计（点击展开）` contains the verbose analysis panels.

## Advanced statistics retained

Nothing from earlier analytics was removed. The collapsed advanced section still contains, according to EnergyView settings:

- recovery / depletion evidence tables;
- rhythm / Lag / continuous-work / stop-proxy analysis;
- detailed weekly review;
- evidence-gated management model;
- N-of-1 experiment comparison;
- recent raw Energy records.

## Quick record button

EnergyView now receives the existing dashboard `onQuickCreate` handler. The top action sends:

- `preferredBlockId = core.energy`;
- current EnergyView Goal path in `__goalContext`.

This opens the existing Energy QuickInput flow instead of creating a second recording implementation.

## Data/model changes

Timeline point models now also carry runtime Energy context so selecting an older map point can show nearby activity and same-day signals. The context remains runtime-only and is not written back to Markdown.

## Files added

- `src/features/settings/views/runtime/EnergyWeeklyMap.tsx`
- `src/features/settings/views/runtime/EnergySampleDetail.tsx`
- `src/features/settings/views/runtime/EnergyInsightCards.tsx`
- `src/features/settings/views/runtime/EnergyAdvancedPanel.tsx`
- `src/styles/features/energy-map.css`

## Files changed

- `src/features/settings/views/runtime/EnergyView.tsx`
- `src/features/settings/views/models/progressViewModel.ts`
- `src/features/settings/layout/viewPropsFactory.ts`
- `src/styles/features/energy-view.css`
- `src/styles/main.css`
- version files / roadmap / README

## Non-goals

1.0.24 does not add new analytical claims. It is primarily a product/UI convergence release. Threshold calibration and data-quality diagnostics move to 1.0.25.
