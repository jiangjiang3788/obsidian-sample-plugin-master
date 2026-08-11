# Energy 1.0.17 - Runtime Context Association

## Scope

1.0.17 adds runtime-only context around exact Energy snapshots. It does **not** write inferred relationships back to `01/目标精力.md` and does not claim causation.

## Activity association

For an Energy sample with an exact `日期 + 时间`, Think OS looks only at records under the same Goal when the Energy record is Goal-bound.

Task/timer-applied intervals are classified as:

- `active`: Energy happened inside the task interval -> `high` confidence.
- `recent` within 15 minutes after task end -> `high` confidence.
- `recent` within 60 minutes -> `medium` confidence.
- `recent` within 120 minutes -> `low` confidence.

Only `active/high/medium` associations are exposed as the primary reliable activity in the Goal Energy card. Low-confidence candidates remain available to the resolver but are not presented as a reliable nearby activity.

Timer context uses the task start/end/duration written by the existing Timer flow after the timer is applied. A currently-running transient timer that has not yet been applied is intentionally not coupled into ProgressView in this version.

## Daily background signals

Same-day, same-Goal habit records are recognized conservatively as:

- Sleep (`睡眠/睡觉/睡醒`)
- Body (`身体/体力/身体状态`)
- Exercise (`运动/锻炼/健身/跑步/散步/八段锦/瑜伽/骑行/游泳`)

They are shown as background facts only. Think OS does not label them as causes.

## Missing and uncertainty

- Missing Energy date/time -> no context resolution.
- No reliable nearby task -> `无可靠附近活动`.
- No data is converted to zero.
- Context is recomputed from DataStore items and can change if source records are edited.
