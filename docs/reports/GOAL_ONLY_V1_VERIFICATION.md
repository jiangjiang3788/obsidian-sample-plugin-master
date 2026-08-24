# Goal-only V1 Verification

Run from the project root in an environment where dependencies can be installed.

## Gate A — compile/test/build

```bash
npm ci
npm run typecheck
npm run gate:goal-only
npm run gate:records
npm run gate:energy
npm run test:unit
npm run build
```

Do not accept the checkpoint as runnable unless every command required by your workflow exits 0. A successful Vite build alone is not enough if unit tests fail.

## Gate B — converted Record data

The converted vault must satisfy:

```text
9437 Record blocks total
0 Record without 目标
0 目标ID fields
0 主题 fields
0 记录版本 fields
0 explicit 记录版本:: / 目标ID:: / 主题:: markers anywhere in the converted vault
2263 TaskSession references, all resolving to a Task
```

`converted-data/data-audit-v1.json` contains the machine-counted result shipped with the delivery.

## Gate C — converted settings

The converted `data.json` should have no persisted occurrences of these keys:

```text
schemaVersion
themePath
themePaths
rootTheme
leafTheme
activeThemePaths
defaultThemePath
defaultGoalId
goalId
variantId
```

It contains 72 Goal paths and 166 GoalTemplates, with one unique Goal path × CoreBlock cell per template.

The API key is intentionally blank and `persistApiKey` is false in the converted settings. Re-enter a key manually after testing and rotate the previously shared key.

## Gate D — fixed canary records

Before replacing your live vault, use a copy and verify at least these paths in QuickInput/edit/Timeline/Table/Heatmap/Search:

```text
照顾好自己/健康/睡眠
照顾好自己/健康/身体
工作能力/工作/设计
武装大脑/思考/读书
```

For a Task with start/end time, verify Timeline shows the same Goal after opening the record for edit.

## Gate E — stop rule for the next checkpoint

Do not start semantic Goal-tree cleanup (`照顾好自己/健康/睡眠 -> 照顾好自己/睡眠`) until the lossless Goal-only checkpoint passes the tests above. Tree cleanup is a separate operation from deleting Theme architecture.
