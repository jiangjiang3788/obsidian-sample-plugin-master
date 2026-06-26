# GOAL_CENTER_MVP36：打卡视图目标 × 打卡预设修复报告

## 结论

v18 的方向是对的，但实现没有打到真正的问题：它把 Heatmap 从“主题优先”改成了“目标优先 + 主题二级”，但二级维度仍然是主题，不是目标下的打卡表单/预设。

这会导致两个问题：

1. 如果同一个目标下多个打卡预设共享主题，仍会混在一个格子里，出现数字 `2`、`3`。
2. 如果旧记录没有显式目标字段，但有 `模板ID`，旧实现无法从新目标预设反推出目标，因此仍可能落回主题视角或未归属。

本版修复为：

```text
目标 = 第一层分组
打卡预设 / 目标模板 = 第二层分组
主题 = 预设的 metadata，用于图标、默认主题和统计
```

## 本版修改

### 1. Heatmap ViewModel 按目标预设聚合

修改：

```text
src/features/settings/viewModels/heatmapViewModel.ts
```

旧逻辑：

```text
goalPath -> themePath -> date -> items
```

新逻辑：

```text
goalPath -> presetKey -> date -> items
```

其中 `presetKey` 优先来自：

```text
item.templateId -> goalTemplate.id
item.templateId -> goalTemplate.defaultValues.legacyOverrideId
item.goalId + coreBlock + templateVariantId
fallback: goalPath + themePath + coreBlock
```

这样历史记录即使没有完整写入 `目标::`，只要保留了模板 ID，也能归回正确目标预设。

### 2. 目标下显示多个打卡表单

同一个目标下，现在会显示：

```text
#照顾好自己
  睡眠任务
  心情任务
  姨妈任务

#强健身体
  运动任务
  身体任务
```

而不是：

```text
健康/睡眠
健康/运动
健康/心情
```

### 3. 修复同主题多预设 key 冲突

修改：

```text
src/shared/ui/views/HeatmapView.tsx
```

v18 中 `renderThemeGroup` 的 key 还是用 `themePath`，这意味着同一个目标下多个预设如果主题相同，会被 Preact 复用/覆盖。

本版加入：

```text
entry.presetKey
entry.label
```

行标题优先显示预设名，key 优先使用预设 ID。

### 4. 保留主题，但不再用主题决定分组

主题仍然用于：

```text
ratingMapping
图标
默认主题
统计二级维度
QuickInput 创建上下文
```

但 Heatmap 的二级行不再由主题决定，而是由目标预设决定。

## 验证

受当前沙盒依赖限制，完整 `npm run build` 不能运行；`tsc` 仍卡在缺少 `node / preact / vite/client` 类型依赖。

已执行：

```bash
npx tsc -p tsconfig.json --noEmit
```

结果仍为环境依赖缺失，不是本次修改文件的业务错误。

