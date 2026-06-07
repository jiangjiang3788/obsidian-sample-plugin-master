# GOAL_CENTER_MVP32_REGRESSION_AND_SUMMARY_REPORT

本版目标：在 v14 的“目标主线 + 主题二级维度”之后，继续推进迁移计划第 28、29、31 项，同时保持用户不用跑脚本。

## 本版完成

1. 新增“5. 回归检查与收尾报告”UI。
2. 新增新建记录回归检查：按 Block 检查是否有输出模板、是否已有目标预设、是否有默认预设。
3. 新增旧记录编辑回归检查：基于旧记录深度扫描，判断旧记录是否仍有未匹配项、是否有 coreBlock / goal / theme 字段。
4. 新增自动迁移收尾报告：在 UI 中生成可复制 Markdown 报告，包含总览、校验、新建记录回归、旧记录编辑回归和下一步建议。
5. 继续保留主题为表单默认值与统计维度，不恢复旧 Theme × Block 模板系统。

## 修改文件

- `src/core/goal/themeOverrideMigration.ts`
- `src/core/goal/index.ts`
- `src/features/settings/input/goalManager/ThemeOverrideMigrationPanel.tsx`

## 新增核心函数

```ts
buildThemeOverrideMigrationRegressionReport(settings, items)
buildThemeOverrideMigrationSummaryReport(settings, items)
```

## 当前进度表

| 序号 | 事项 | 进度 | 本版变化 |
|---:|---|---|---|
| 1 | 迁移准备 / 备份 | 已完成 | v9 已新增一键备份 UI |
| 2 | 数据审计 | 已完成 | v10 已新增完整审计 UI |
| 3 | 旧记录扫描 | 已完成 | v11 已新增深度扫描 |
| 4 | 目标识别 | 已完成 | 主题归类到目标，不再主题变目标 |
| 5 | 新旧映射 | 已完成 | 支持 `legacyOverrideId → goalTemplate` |
| 6 | 目标模板结构 | 已完成 | `goalId + coreBlockId + variantId` |
| 7 | 目标库去周期/主题 | 已完成 | 周期归预设，主题归表单 |
| 8 | 迁移计划生成 | 已完成 | 已接入 UI |
| 9 | 迁移执行 | 已完成 | 可在 UI 中迁移 |
| 10 | 旧主题表单迁移 | 已完成 | 字段、输出、保存位置已迁移 |
| 11 | 模板改写 | 部分完成 | 新预设模板已改写；旧 Markdown 深度改写已推进 |
| 12 | 周期迁移 | 已完成 | 周期在预设里 |
| 13 | 主题降级 | 已完成 | 主题保留为表单默认值和统计维度 |
| 14 | 旧记录改写 | 已完成 | v12 支持任务行与块字段深度改写 |
| 15 | 任务行改写 | 已完成 | v12 支持任务行内字段改写 |
| 16 | 解析器清理 | 已完成 | v13 运行时不再回退 ThemeOverride |
| 17 | QuickInput 主链路 | 已完成 | 目标 → Block → 预设 |
| 18 | QuickInput 主题/周期同步 | 已完成 | 已同步 |
| 19 | 目标中心 UI | 已完成 | 目标 × Block 预设表 |
| 20 | 目标库 UI | 已完成 | 目标库只管目标 |
| 21 | 预设编辑 | 已完成 | 多表单表格编辑 |
| 22 | 旧配置清理 | 已完成 | v13 新增 UI 清理旧 `inputSettings.overrides` |
| 23 | 类型清理 | 部分完成 | GoalTemplateResolver 类型已收敛；parser 仍保留旧记录读取能力 |
| 24 | 视图修正 | 已完成 | v14 展示目标主线 + 主题二级维度 |
| 25 | 数据源修正 | 已完成 | v14 统一目标/主题筛选字段处理 |
| 26 | AI 输入 | 待做 | 可后置 |
| 27 | 迁移校验 | 已完成 | 已完成校验 UI |
| 28 | 新建记录回归 | 已完成 | v15 新增按 Block 的新建记录回归检查 |
| 29 | 编辑旧记录回归 | 已完成 | v15 新增旧记录编辑就绪检查与报告 |
| 30 | 目标 × Block 表格回归 | 已完成 | 多预设可见、可编辑 |
| 31 | 清理报告 | 已完成 | v15 新增可复制的迁移收尾 Markdown 报告 |
| 32 | 最终清理 | 部分完成 | 旧主题模板运行时链路已断开；旧 UI 入口后续继续清理 |
| 33 | 构建验证 | 部分完成 | 当前环境缺 `node/preact/vite/client` 类型依赖，本地需跑 |

## 验证

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

所以完整 typecheck 需要在本地执行：

```bash
npm ci
npm run typecheck:src
npm run build
```

## 下一版建议

继续推进第 32、33 项：最终清理旧 UI 入口、做构建验证；如果你希望 AI 输入也迁移到目标预设链路，则优先处理第 26 项。
