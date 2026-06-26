# DATA_REVIEW_MVP9

Input data reviewed:

- `/mnt/data/data.from-html-presets(1).json`
- `data.mvp8-cleaned.json`

## Result

MVP9 produces `data.mvp9-cleaned.json`.

## Main data cleanup

| Area | Before MVP9 | After MVP9 |
|---|---:|---:|
| View display fields | 34 | 32 |
| Noisy view display fields (`templateId`, `cycleId`, period internals, repeat token) | 2 | 0 |
| View filters using old category / recurrence axes | 5 | 0 |
| View filters using `coreBlock` | 0 | 4 |
| View filters using derived `taskStatus` | 0 | 3 |

## Important conversions

- `categoryKey = 打卡` → `coreBlock = habit`
- `categoryKey = 完成任务` → `coreBlock = task` + `taskStatus = done`
- `categoryKey = 未完成任务` → `coreBlock = task` + `taskStatus = open`
- `cycleId` display column removed from default view fields
- `templateId` display column removed from default view fields
- `categoryKey` display/group axes normalized to `coreBlock`

## Notes

MVP9 still keeps file-based filters such as `file.basename != 2-2三餐` because that is user-specific view behavior, not a domain-model conflict.
