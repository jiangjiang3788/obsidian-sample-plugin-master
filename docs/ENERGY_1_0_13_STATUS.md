# Think OS Energy 1.0.13 status

## Scope

1.0.13 refines Energy capture without changing its architecture: Energy remains a Goal-bound direct record type and never becomes a GoalTemplate.

## User-facing behavior

- Quick capture now exposes exactly five levels: `20 / 40 / 60 / 80 / 100`.
- `0` is no longer offered in quick mode. Existing 1.0.12 records containing `0` remain valid historical data.
- Detailed mode splits Energy into two independent percentage values:
  - `脑力精力:: 0..100`
  - `体力精力:: 0..100`
- Detailed mode derives `精力值` as the rounded arithmetic mean of brain and physical energy.
- The record stores `综合算法:: arithmetic-mean-v1` so future weighting changes stay auditable.
- Quick mode still saves immediately after one click.
- Detailed mode requires an explicit save because two values are being reviewed.

## Markdown examples

Quick:

```text
<!-- start -->
核心Block:: energy
记录子类型:: snapshot
目标ID:: goal.我若安好便是晴天
目标:: #我若安好便是晴天
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

Detailed:

```text
<!-- start -->
核心Block:: energy
记录子类型:: snapshot
目标ID:: goal.我若安好便是晴天
目标:: #我若安好便是晴天
分类:: 精力
日期:: 2026-08-10
时间:: 16:20
主题:: 生活
精力值:: 57
脑力精力:: 73
体力精力:: 41
综合算法:: arithmetic-mean-v1
精力档位:: 60
评分模式:: detailed
记录方式:: realtime
时间精度:: exact
来源:: desktop-panel
<!-- end -->
```

## Validation status

Passed in the provided source environment:

- version sync gate
- architecture gate
- feature boundary gate
- core public gate
- CSS boundary gate
- current schema gate

Full project typecheck/build remains blocked by missing package dependencies in the uploaded source package (`node`, `preact`, `vite/client` type definitions are unavailable in this environment).
