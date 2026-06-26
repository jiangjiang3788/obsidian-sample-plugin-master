# 目标中心 MVP18：旧主题模板迁移到目标预设（基础 UI 第一版）

## 背景

用户不希望通过脚本迁移。第一版提供一个基础 UI，在目标中心里直接完成旧主题模板迁移。

旧结构：

```text
Theme × Block override
```

新结构：

```text
Goal × Block × Preset
```

主题不再决定模板，只作为主题路径、图标、领域等 metadata 保留。

## 第一版做了什么

### 1. 新增“迁移”页签

目标中心增加一级页签：

```text
目标 / 预设表 / 指标 / 迁移 / 高级
```

“迁移”页签里有基础 UI：

1. 预览旧主题模板数量。
2. 预览将创建的目标数量。
3. 预览将创建的目标预设数量。
4. 一键迁移到目标 × Block 预设表。
5. 可选轻量改写旧记录。

### 2. 新增迁移计划生成器

新增文件：

```text
src/core/goal/themeOverrideMigration.ts
```

核心函数：

```ts
buildThemeOverrideGoalMigrationPlan(settings, items)
```

它只读生成迁移计划，不直接写数据。

识别目标的优先级：

1. 旧模板输出里写死的 `目标:: #xxx`。
2. 已扫描旧记录中 `模板ID:: ovr_xxx` 对应的目标统计。
3. 兜底使用主题路径生成目标，例如 `健康/运动` -> `#健康/运动`。

### 3. 一键迁移配置

新增 UseCase：

```ts
previewThemeOverrideGoalMigration()
applyThemeOverrideGoalMigration()
```

执行后会：

1. 创建缺失目标。
2. 把旧 ThemeOverride 迁移为 GoalTemplate。
3. 每个旧模板生成一个预设。
4. 同一个目标 × Block 下多个旧模板会变成多个预设。
5. 只给同一个单元格里的第一个可用预设设为默认。
6. 清空旧 `inputSettings.overrides`，避免继续使用旧主题模板。

### 4. 可选轻量改写旧记录

新增 UseCase：

```ts
applyThemeOverrideRecordMigration(limit)
```

它会尝试把已经扫描到的旧记录行从旧格式改成新格式：

```text
模板来源:: override
模板ID:: ovr_xxx
```

改成：

```text
模板来源:: goal-template
模板ID:: goal-template.xxx
目标ID:: goal.xxx
目标:: #xxx
核心Block:: core.xxx
```

这是第一版轻量改写：主要处理 DataStore 能定位到的记录行。复杂块级 Markdown 的完全结构化改写后续再做。

## UI 使用方式

1. 打开设置。
2. 进入目标中心。
3. 点击“迁移”。
4. 点“查看预览”。
5. 确认旧主题、Block、目标、预设映射。
6. 点击“1. 迁移到目标预设”。
7. 到“预设表”检查目标 × Block 单元格。
8. 检查无误后，回到“迁移”，点击“2. 轻量改写旧记录”。

## 文件修改

新增：

```text
src/core/goal/themeOverrideMigration.ts
src/features/settings/input/goalManager/ThemeOverrideMigrationPanel.tsx
GOAL_CENTER_MVP18_THEME_TO_GOAL_MIGRATION_UI_REPORT.md
```

修改：

```text
src/core/goal/index.ts
src/core/public.ts
src/app/usecases/goal.usecase.ts
src/features/settings/input/GoalManager.tsx
src/core/goal/templates.ts
```

## 验收标准

### 设置迁移验收

- 目标中心出现“迁移”页签。
- 迁移页能看到旧模板数量、可迁移数量、新目标数量、新预设数量。
- 点击迁移后，旧主题模板会出现在“预设表”的目标 × Block 单元格中。
- `inputSettings.overrides` 被清空。
- `goalSettings.goals` 增加目标。
- `goalSettings.goalBlockBindings` 增加目标预设。

### 记录迁移验收

- 点击“轻量改写旧记录”后，能更新已扫描旧记录行。
- 新记录行包含 `模板来源:: goal-template`。
- 新记录行包含新的 `模板ID`。
- 新记录行包含 `目标ID`、`目标`、`核心Block`。

## 当前限制

1. 第一版重点是基础 UI 和配置迁移，不做复杂向导。
2. 旧记录改写是轻量行级回填，不保证能完美重写所有块级 Markdown 结构。
3. 执行前建议手动备份 `data.json` 和笔记库。
4. 如果兜底目标不满意，可以先迁移，再在目标库里手动整理目标路径。
