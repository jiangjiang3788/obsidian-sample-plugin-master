# GOAL_CENTER_MVP23_MIGRATION_VALIDATION_REPORT

## 本版目标

在上一版修复 `presetName is not defined` 之后，继续推进迁移收口：

1. 增加“迁移校验”面板，让你不用跑脚本也能看到迁移是否干净。
2. 继续强化旧记录改写入口，一次尝试处理更多旧记录。
3. 继续保持产品方向：目标承接主题；主题保留在表单；目标 × Block 下有多个表单预设。

## 本版修改

### 1. 新增迁移校验核心函数

新增位置：

```text
src/core/goal/themeOverrideMigration.ts
```

新增：

```ts
validateThemeOverrideGoalMigration(settings, items)
```

它会检查：

- 旧 `inputSettings.overrides` 是否还有残留。
- 旧记录里是否还有 `模板来源:: override` 或 `模板ID:: ovr_xxx`。
- 目标预设是否有孤儿预设。
- 一个目标 × Block 单元格里是否有多个默认预设。
- 迁移后的预设是否保留了默认主题。

### 2. 迁移页新增“迁移校验”区域

修改位置：

```text
src/features/settings/input/goalManager/ThemeOverrideMigrationPanel.tsx
```

现在迁移页会显示：

```text
迁移校验
目标数量
目标预设数量
旧记录数量
错误/提醒/通过
```

并且用表格列出：

```text
项目 | 状态 | 数量 | 说明
```

这样你不用打开控制台，也不用跑脚本。

### 3. 旧记录改写数量上限提高

原来按钮一次处理 800 条旧记录，现在提高到 5000 条：

```ts
applyThemeOverrideRecordMigration(5000)
```

这仍然是 UI 按钮，不需要你自己跑脚本。

## 当前计划表进度

| 序号 | 进度 | 修改类型 | 说明 | 预计时长 | 验收 | MVP |
|---:|---|---|---|---:|---|---|
| 1 | 待做 | 迁移准备 | 自动创建完整备份：`data.json.bak`、Vault Markdown 备份、迁移日志目录。 | 0.5h | 可以一键恢复到迁移前状态。 | 必做 |
| 2 | 部分完成 | 数据审计 | 已有基础迁移预览和本版校验面板；还缺可导出的完整审计报告。 | 0.5h | 显示 Block、Theme、Override、GoalTemplate 数量。 | 必做 |
| 3 | 部分完成 | 数据审计 | 已有旧记录残留数量校验；还缺按 override 分组的完整 Markdown 统计。 | 1h | 能列出每个 override 被多少条记录使用。 | 必做 |
| 4 | 已完成 | 目标识别 | 方向已改为“主题归类到目标”，不再把主题直接创建成目标。 | 1h | 低置信度项由用户手动归类。 | 必做 |
| 5 | 已完成 | 映射设计 | 已支持主题到目标的映射和迁移。 | 0.5h | 不重复创建目标或预设。 | 必做 |
| 6 | 已完成 | 数据结构 | 已使用 `goalId + coreBlockId + variantId` 表达目标 × Block × 预设。 | 0.5h | 同一目标 × Block 下可有多个预设。 | 必做 |
| 7 | 已完成 | 数据结构 | 目标库不再把所有主题自动变成目标；周期不写入目标。 | 0.5h | 目标库不出现周期选择。 | 必做 |
| 8 | 部分完成 | 迁移计划 | 已有 UI 预览；还需要更完整的 dry-run 明细导出。 | 1h | 展示将创建多少目标、多少预设、多少记录会被改写。 | 必做 |
| 9 | 已完成 | 迁移执行 | 已能将主题表单迁移到目标预设。 | 1.5h | 迁移后目标 × Block 表格能看到预设。 | 必做 |
| 10 | 已完成 | 字段迁移 | 已迁移 `fields / outputTemplate / targetFile / appendUnderHeader / disabled / status`。 | 1h | 新预设保留旧字段、保存文件和标题位置。 | 必做 |
| 11 | 部分完成 | 模板改写 | 已有轻量改写；还需覆盖更多行内格式。 | 1h | 新记录不再出现 `模板来源:: override`。 | 必做 |
| 12 | 已完成 | 周期迁移 | 周期放在预设里，默认日；QuickInput 从预设取周期。 | 1h | 周期不在目标库。 | 必做 |
| 13 | 已完成 | 主题降级 | 主题作为预设默认值保留：`themePath / 主题 / icon`。 | 0.5h | 选中预设时主题能自动带出。 | 必做 |
| 14 | 部分完成 | 旧记录改写 | 本版把 UI 改写上限提高到 5000，并新增旧记录残留校验。仍缺备份和复杂行内格式全覆盖。 | 2h | 全库搜索不到 `模板来源:: override`。 | 必做 |
| 15 | 待做 | 旧记录改写 | 对任务行内 `(模板ID::ovr_xxx)` 等格式做完整改写。 | 1h | 任务、打卡、计划、总结、闪念都能被 parser 识别成新格式。 | 必做 |
| 16 | 部分完成 | 解析器清理 | 运行主链已偏向 GoalTemplate；旧 override 入口还需彻底清理。 | 1h | 新建记录不会走 theme override。 | 必做 |
| 17 | 已完成 | QuickInput | 已改为目标 → Block → 预设链路。 | 1.5h | 多预设可选，单预设自动选中。 | 必做 |
| 18 | 已完成 | QuickInput | 已同步 `themePath / 主题 / selectedThemeId / icon`。 | 1h | 切换预设后主题和周期符合预设。 | 必做 |
| 19 | 已完成 | 目标中心 UI | 已保留目标 × Block 预设表，并使用更接近旧主题矩阵的 UI。 | 1h | 用户看到目标、Block、预设。 | 必做 |
| 20 | 已完成 | 目标库 UI | 已移除目标库周期和默认主题绑定，目标库只管理目标。 | 0.5h | 目标库没有周期下拉和主题必填。 | 必做 |
| 21 | 已完成 | 预设编辑 | 已改成表格显示多个预设；上一版修复 `presetName` 崩溃。 | 1h | 每个目标 × Block 下多个表单可见、可编辑。 | 必做 |
| 22 | 部分完成 | 旧配置清理 | 已开始弱化旧主题模板；还需迁移完成后彻底清理。 | 0.5h | 数据里没有可用 ThemeOverride 模板。 | 必做 |
| 23 | 待做 | 类型清理 | 删除正常运行路径中对 override 的依赖。 | 1h | 搜索 `templateSourceType === "override"` 只剩迁移代码。 | 必做 |
| 24 | 待做 | 视图修正 | 目标统计、目标经验、ExcelView、HeatmapView 统一读新字段。 | 1h | 目标统计按新目标聚合，主题仍可作为二级维度。 | 必做 |
| 25 | 待做 | 数据源修正 | DataSource 保留 `goalPath / themePath / coreBlock`，不依赖旧主题模板。 | 0.5h | 原任务、打卡、计划总结视图还能显示。 | 必做 |
| 26 | 待做 | AI 输入 | AI 落到目标 → Block → 预设。 | 1h | AI 创建记录写入新 `templateId` 和 `goalId`。 | 可后置 |
| 27 | 已完成 | 校验 | 本版新增迁移校验：旧模板残留、旧记录残留、孤儿预设、多个默认、缺少默认主题。 | 1h | 校验面板可显示 error/warning/ok。 | 必做 |
| 28 | 部分完成 | 回归测试 | 已做针对性静态检查；还需你本地真实 Obsidian 新建记录测试。 | 1h | 8 个核心 Block 各新建一条成功。 | 必做 |
| 29 | 待做 | 回归测试 | 编辑旧记录并保存为新格式。 | 1h | 保存后不出现 override，内容不丢。 | 必做 |
| 30 | 已完成 | 回归测试 | 目标 × Block 表格可以显示多个预设；上一版修复表格崩溃。 | 0.5h | 不再出现 `presetName` 未定义。 | 必做 |
| 31 | 已完成 | 清理报告 | 每版均附报告；本版为 MVP23。 | 0.5h | 报告可复查。 | 必做 |
| 32 | 部分完成 | 最终清理 | 旧主题模板 UI 已弱化；彻底删除等迁移稳定后执行。 | 0.5h | 用户侧最终看不到旧主题模板。 | 必做 |
| 33 | 部分完成 | 构建验证 | 当前环境缺少依赖类型；本版做了针对性静态检查。 | 0.5h | 本地 `npm ci && npm run build` 通过。 | 必做 |

## 修改文件

```text
src/core/goal/themeOverrideMigration.ts
src/core/goal/index.ts
src/core/public.ts
src/features/settings/input/goalManager/ThemeOverrideMigrationPanel.tsx
GOAL_CENTER_MVP23_MIGRATION_VALIDATION_REPORT.md
```

## 下一步建议

下一版优先做“旧记录完整改写”。重点是覆盖行内任务格式：

```text
(模板ID::ovr_xxx)
(模板来源::override)
```

以及批量写入前的简单备份提示。
