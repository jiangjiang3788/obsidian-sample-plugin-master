# Think OS Energy Direct Record Protocol v1

## Identity

Energy is a Goal-bound Direct Record Type. It is not a GoalTemplate and must not write `模板ID` or `模板来源`.

## Scale

There is one numeric truth scale: integer `0..100`.

### Quick capture

The quick UI exposes exactly five points:

`20 / 40 / 60 / 80 / 100`

Quick capture writes the selected value directly to `精力值` and `精力档位`.

### Detailed capture

Detailed capture records two independent raw values:

- `脑力精力:: 0..100`
- `体力精力:: 0..100`

For compatibility with a single Energy timeline, v1 derives:

`精力值 = round((脑力精力 + 体力精力) / 2)`

and stores:

`综合算法:: arithmetic-mean-v1`

The two raw dimensions are authoritative for detailed analysis. The derived `精力值` is only the common aggregate channel.

## Missing data

No Energy record means unknown. Missing values must never be converted to `0`, `20`, or any other default observation.

## Goal binding

Energy may inherit a current Goal context or use a configured default Goal. It does not resolve through GoalTemplate.

## Target file

Default target:

`01/目标精力.md`

Records are appended under:

`## {{goalPath}}`


## Retrospective capture

Desktop retrospective capture is exact-time only in 1.0.14.

- `日期` + `时间` are the actual occurrence date and exact `HH:mm` time selected by the user.
- `记录方式:: retrospective` marks a backfilled observation.
- `记录时间` stores when the user actually entered the backfill.
- `时间精度:: exact` is used for both realtime and retrospective desktop capture.
- The UI does not offer relative or fuzzy choices such as "刚才 / 上午 / 下午 / 晚上".
- A retrospective record without an exact occurrence time must not be submitted by the desktop capture use case.

Example:

```text
日期:: 2026-08-10
时间:: 15:20
精力值:: 40
记录方式:: retrospective
时间精度:: exact
记录时间:: 2026-08-10 21:35
```
