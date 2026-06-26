# GOAL CENTER MVP30 - Runtime Cleanup + Legacy Override Finalizer

## 本版目标

v13 不只做一步。本版集中推进计划表里的第 16、22、23、29 项：

- 第 16 项：解析器清理
- 第 22 项：旧配置清理
- 第 23 项：类型清理
- 第 29 项：编辑旧记录回归增强

核心方向：运行时不再复活旧 Theme × Block override。主题仍然保留，但只作为表单默认值、图标、分类和统计维度。

---

## 已完成改动

### 1. GoalTemplateResolver 不再回退 ThemeOverride

文件：

- `src/core/services/GoalTemplateResolver.ts`

调整前：当找不到 CoreBlock / legacy base block 时，仍会调用 `TemplateResolver.resolve(settings.inputSettings, blockId, themeId)`，存在重新应用旧 Theme × Block override 的风险。

调整后：运行时主链路固定为：

```text
GoalTemplate -> CoreBlock -> legacy base block
```

如果连基础 Block 都找不到，直接返回空结果，不再从 `inputSettings.overrides` 恢复旧模板。

### 2. TemplateResolver 不再应用 ThemeOverride

文件：

- `src/core/services/TemplateResolver.ts`

旧 `TemplateResolver` 仍保留兼容 API，但内部不再合并 override 字段、输出、文件、标题。`themeId` 只用于解析主题 metadata。

这样即使旧工具函数仍调用 `TemplateResolver.resolve()`，也不会重新进入旧主题模板链路。

### 3. 迁移页新增“4. 清理旧主题表单”

文件：

- `src/features/settings/input/goalManager/ThemeOverrideMigrationPanel.tsx`
- `src/app/usecases/goal.usecase.ts`

迁移页新增按钮：

```text
4. 清理旧主题表单
```

作用：

- 清空 `inputSettings.overrides`
- 保留 `inputSettings.themes`
- 主题仍可作为表单默认主题和统计维度
- 旧 Theme × Block 模板不再参与运行时解析

### 4. 编辑旧记录时优先识别核心 Block

文件：

- `src/core/services/recordInput/editStateResolver.ts`

现在编辑记录时会优先读取：

```text
核心Block:: task
核心Block:: habit
extra.coreBlock
extra.coreBlockId
```

这样即使旧 override 被清理，只要记录已经写入新格式或补齐了 `核心Block`，编辑器仍能更稳地还原 Block 表单。

### 5. 类型收敛

文件：

- `src/core/services/GoalTemplateResolver.ts`

`GoalTemplateSourceType` 从：

```text
core-block | goal-template | goal-binding | legacy-block | block | override | null
```

收敛为：

```text
core-block | goal-template | legacy-block | null
```

说明：parser 和 record codec 仍然保留读取旧 `override` 的能力，因为它们要扫描旧记录；但新运行时解析器不再产出 `override`。

---

## 当前进度表

| 序号 | 事项 | 进度 | 本版变化 |
|---:|---|---|---|
| 1 | 迁移准备 / 备份 | 已完成 | v9 已新增一键备份 UI。 |
| 2 | 数据审计 | 已完成 | v10 已新增完整审计 UI。 |
| 3 | 旧记录扫描 | 已完成 | v11 已新增深度扫描。 |
| 4 | 目标识别 | 已完成 | 主题归类到目标，不再主题变目标。 |
| 5 | 新旧映射 | 已完成 | 支持 `legacyOverrideId -> goalTemplate`。 |
| 6 | 目标模板结构 | 已完成 | `goalId + coreBlockId + variantId`。 |
| 7 | 目标库去周期/主题 | 已完成 | 周期归预设，主题归表单。 |
| 8 | 迁移计划生成 | 已完成 | 已接入 UI。 |
| 9 | 迁移执行 | 已完成 | 可在 UI 中迁移。 |
| 10 | 旧主题表单迁移 | 已完成 | 字段、输出、保存位置已迁移。 |
| 11 | 模板改写 | 部分完成 | 新预设模板已改写；旧 Markdown 深度改写已推进。 |
| 12 | 周期迁移 | 已完成 | 周期在预设里。 |
| 13 | 主题降级 | 已完成 | 主题保留为表单默认值和统计维度。 |
| 14 | 旧记录改写 | 已完成 | v12 支持任务行与块字段深度改写。 |
| 15 | 任务行改写 | 已完成 | v12 支持任务行内字段改写。 |
| 16 | 解析器清理 | 已完成 | v13 运行时不再回退 ThemeOverride。 |
| 17 | QuickInput 主链路 | 已完成 | 目标 -> Block -> 预设。 |
| 18 | QuickInput 主题/周期同步 | 已完成 | 已同步。 |
| 19 | 目标中心 UI | 已完成 | 目标 × Block 预设表。 |
| 20 | 目标库 UI | 已完成 | 目标库只管目标。 |
| 21 | 预设编辑 | 已完成 | 多表单表格编辑。 |
| 22 | 旧配置清理 | 已完成 | v13 新增 UI 清理旧 `inputSettings.overrides`，保留主题库。 |
| 23 | 类型清理 | 部分完成 | GoalTemplateResolver 类型已收敛；parser/codec 仍保留旧记录读取能力。 |
| 24 | 视图修正 | 待做 | 目标主线 + 主题二级维度待做。 |
| 25 | 数据源修正 | 待做 | 视图过滤字段待统一。 |
| 26 | AI 输入 | 待做 | 可后置。 |
| 27 | 迁移校验 | 已完成 | 已完成校验 UI。 |
| 28 | 新建记录回归 | 待做 | 8 类 Block 待逐项验证。 |
| 29 | 编辑旧记录回归 | 部分完成 | v13 增强核心 Block 提示识别。 |
| 30 | 目标 × Block 表格回归 | 已完成 | 多预设可见、可编辑。 |
| 31 | 清理报告 | 部分完成 | 每版报告已生成。 |
| 32 | 最终清理 | 部分完成 | 旧主题模板运行时链路已断开；旧 UI 入口后续继续清理。 |
| 33 | 构建验证 | 部分完成 | 当前环境缺类型依赖，本地需跑。 |

---

## 验证情况

执行：

```bash
npm run typecheck:src
```

当前环境仍缺少类型依赖：

```text
node
preact
vite/client
```

本次改动曾先触发一次 TSX 字符串语法错误，已修复。再次运行后只剩上述依赖缺失错误。

---

## 下一版建议

下一版建议推进第 24、25 项：

```text
目标主线 + 主题二级维度
```

也就是视图里先按目标看，再在目标下面按主题分组。主题不恢复为模板系统，只作为目标下的统计维度。
