# GOAL_CENTER_MVP34_BUILD_EXPORT_FIX_REPORT

## 本版目标

修复 v16 在生产构建中暴露出的 `@core/public` 门面导出缺失问题，并继续收尾目标迁移链路的构建可用性。

## 修复的问题

用户本地构建报错：

```text
src/features/settings/input/goalManager/ThemeOverrideMigrationPanel.tsx:
"buildThemeOverrideMigrationRegressionReport" is not exported by "src/core/public.ts"
```

原因：

- `buildThemeOverrideMigrationRegressionReport` 已经在 `src/core/goal/themeOverrideMigration.ts` 中实现。
- `src/core/goal/index.ts` 已经导出该函数。
- 但 `src/core/public.ts` 作为 core 对 feature 的唯一门面，没有同步导出该函数。
- `ThemeOverrideMigrationPanel.tsx` 从 `@core/public` 引入它，导致 Vite/Rollup 构建失败。

## 本版改动

### 1. 修复 core public 门面导出

修改文件：

```text
src/core/public.ts
```

新增导出：

```ts
buildThemeOverrideMigrationRegressionReport
buildThemeOverrideMigrationSummaryReport
```

新增类型导出：

```ts
ThemeOverrideMigrationRegressionReport
ThemeOverrideMigrationBlockRegressionRow
ThemeOverrideMigrationRegressionStatus
```

## 当前进度表

| 序号 | 事项 | 进度 | 本版变化 |
|---:|---|---|---|
| 1 | 迁移准备 / 备份 | 已完成 | v9 已新增一键备份 UI |
| 2 | 数据审计 | 已完成 | v10 已新增完整审计 UI |
| 3 | 旧记录扫描 | 已完成 | v11 已新增深度扫描 |
| 4 | 目标识别 | 已完成 | 主题归类到目标，不再主题变目标 |
| 5 | 新旧映射 | 已完成 | 支持 legacyOverrideId → goalTemplate |
| 6 | 目标模板结构 | 已完成 | goalId + coreBlockId + variantId |
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
| 22 | 旧配置清理 | 已完成 | v13 新增 UI 清理旧 inputSettings.overrides |
| 23 | 类型清理 | 部分完成 | 主链类型已收敛；旧记录读取类型仍保留 |
| 24 | 视图修正 | 已完成 | v14 展示目标主线 + 主题二级维度 |
| 25 | 数据源修正 | 已完成 | v14 统一目标/主题筛选字段处理 |
| 26 | AI 输入 | 已完成 | v16 AI 快照、Prompt、确认弹窗接入目标 × Block 预设 |
| 27 | 迁移校验 | 已完成 | 已完成校验 UI |
| 28 | 新建记录回归 | 已完成 | v15 新增按 Block 的新建记录回归检查 |
| 29 | 编辑旧记录回归 | 已完成 | v15 新增旧记录编辑就绪检查与报告 |
| 30 | 目标 × Block 表格回归 | 已完成 | 多预设可见、可编辑 |
| 31 | 清理报告 | 已完成 | v15 新增可复制的迁移收尾 Markdown 报告 |
| 32 | 最终清理 | 部分完成 | 旧运行链路已断开；旧 ThemeMatrix 源码仍作为内部 legacy 文件存在 |
| 33 | 构建验证 | 部分完成 | 本版修复 Vite/Rollup 已暴露的 public export 构建错误 |

## 验收建议

本版重点验收命令：

```bash
npm run build
```

如果后续还出现类似：

```text
"xxx" is not exported by "src/core/public.ts"
```

说明还有新的 public 门面遗漏。修法同本版：确认实现是否已在模块 index 导出，再补到 `src/core/public.ts`。

