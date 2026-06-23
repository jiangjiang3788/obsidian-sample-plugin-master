# MVP5 进度：移除插件内迁移 + 设置工作区标签页

## 本版目标

- 插件运行时不再自动迁移 / 自动写回 data.json。
- 插件源码不再携带 Theme × Block / domainConvergence 迁移能力。
- 目标中心去掉“从已有记录导入目标”入口，只服务新模型下的目标管理。
- 设置面板新增 Obsidian Workspace 标签页入口，解决原生设置页空间太小的问题。

## 完成项

| 项目 | 状态 | 完成度 |
|---|---|---:|
| 移除 `src/core/goal/domainConvergence.ts` | 已完成 | 100% |
| 移除 `scripts/migration/one-shot-domain-migration.mjs` | 已完成 | 100% |
| 移除加载时自动 data 收敛 / 自动写回 | 已完成 | 100% |
| 移除 Theme × Block 迁移 helper 出口 | 已完成 | 100% |
| 删除 `themeOverrideMigration.ts` runtime 源码 | 已完成 | 100% |
| GoalUseCase 删除迁移 / Markdown 写回方法 | 已完成 | 95% |
| 目标中心删除旧目标导入 UI | 已完成 | 100% |
| DataManagement 不再出现迁移按钮 | 已完成 | 100% |
| 新增 Obsidian 工作区标签页设置视图 | 已完成 | 85% |
| 新增“打开 Think OS 控制台（标签页）”命令 | 已完成 | 85% |
| 更新 domain gate 约束新政策 | 已完成 | 100% |
| 完整 typecheck / build | 受环境依赖限制未完成 | 20% |

## 新增文件

```text
src/platform/ThinkSettingsView.tsx
MVP5_PROGRESS.md
```

## 删除文件

```text
src/core/goal/domainConvergence.ts
src/core/goal/themeOverrideMigration.ts
scripts/migration/one-shot-domain-migration.mjs
```

## 主要修改文件

```text
src/main.ts
src/core/goal/index.ts
src/core/public.ts
src/app/usecases/goal.usecase.ts
src/app/usecases/index.ts
src/features/settings/index.ts
src/features/settings/SettingsTab.tsx
src/features/settings/input/GoalManager.tsx
src/features/settings/input/goalManager/GoalEntitySection.tsx
src/features/settings/tabs/DataManagementSettings.tsx
src/platform/SettingsTab.tsx
src/shared/styles/settings.css
scripts/gates/domain-convergence-gate.mjs
```

## 已验证

```bash
npm run domain:gate
node scripts/gates/core-public-gate.mjs
node scripts/gates/public-api-gate.mjs
node scripts/gates/feature-gate.mjs
node scripts/gates/arch-gate.mjs
node scripts/gates/obsidian-leak-gate.mjs
node scripts/gates/core-obsidian-gate.mjs
```

全部通过。

## 未验证

```bash
npm run typecheck:src
npm run build
```

当前容器的 `node_modules` 安装不完整，缺少 `@types/node`、`preact`、`vite/client` 类型入口，无法完成完整 TypeScript / Vite 验证。本地解压后建议运行：

```bash
npm ci
npm run typecheck:src
npm run build
npm run domain:gate
```

## 数据检查

你上传的 `data.from-html-presets(1).json` 原始数据仍有旧字段：

| 检查项 | 原始 data | MVP4/MVP5 清理版 |
|---|---:|---:|
| 目标数量 | 9 | 9 |
| 记录预设数量 | 88 | 88 |
| inputSettings.overrides | 0 | 0 |
| 目标层 `granularity` | 9 | 0 |
| 预设层 `granularity` | 88 | 0 |
| 正式 `periodPolicy` | 0 | 20 |
| legacy defaultValues | 88 | 0 |
| `legacy-` variantId | 84 | 0 |
| 重复默认预设单元格 | 3 | 0 |
| 缺默认预设单元格 | 5 | 0 |

结论：请继续使用已清理版本 `data.mvp4-cleaned.json`，它已经符合 MVP5 代码策略。MVP5 不会在插件启动时自动修 data。
