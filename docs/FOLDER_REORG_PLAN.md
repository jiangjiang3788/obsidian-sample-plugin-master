# V20 文件夹归属重排计划

V20 的目标不是立刻大规模移动文件，而是先把下一轮移动的归属规则写清楚。后续 V21～V25 按这个计划执行，每一版只移动一个主领域，避免一次性 import 爆炸。

V21 已执行 QuickInput 归属重排：编辑器和弹窗业务内容已移入 `src/features/quickinput`，`src/platform/obsidian/modals/QuickInputModal.tsx` 只保留 Obsidian Modal 生命周期适配。

V22 已执行 Settings / Views 归属重排：业务运行视图已离开 `src/shared/ui/views`，进入 `src/features/settings/views/runtime`；视图编辑器和 view model 已归并到 `src/features/settings/views`。

V23 已执行 Core 领域目录收敛：`src/core/services/recordInput` 已合并进 `src/core/recordInput`；任务记录工具移入 `src/core/records/task`；记录提交反馈、恢复、调试工具移入 `src/core/recordInput`。

V24 已执行 Shared / Platform 瘦身：所有 Obsidian 适配器已进入 `src/platform/obsidian`；`TaskRow` / `BlockItem` / `HeatmapCell` / `ChartBlock` / Timeline day-column 组件已从 shared 移入 `src/features/settings/views/runtime/components`；shared 不再导出这些业务视图组件。

V25 已执行当前版 schema 锁定：`src/core/settings/currentSettingsSchema.ts` 明确 `current-only` 策略，插件只支持当前 settings schema；根目录 `data.json` 可作为本地运行态文件存在，但 release 包仍然禁止携带。

## 1. 前提

这是单人使用插件，后续只支持当前最新版数据结构：

```text
不做旧数据迁移
不保留旧 data.json schema 兼容
不为了历史字段名保留 fallback
```

但仍然保留当前数据安全：

```text
写入失败不能误删当前笔记
转换记录类型仍然先写新位置，再删旧位置
另存为新记录不能覆盖原记录
release 包不能包含 data.json
```

## 2. data.json 策略

根目录 `data.json` 是本地 Obsidian 插件运行态文件。现在允许它存在于项目根目录：

```text
secret-gate 不再因为根目录 data.json 存在而失败
package-release 不再因为根目录 data.json 存在而失败
release 包仍然只复制 manifest.json、main.js、styles.css
release-boundary 仍然禁止 data.json 进入发布包
.gitignore 仍然忽略 data.json
```

也就是说：本地可以有 `data.json`，发布包不能有 `data.json`。

## 3. 目标目录原则

| 层级 | 归属规则 |
|---|---|
| `core` | 领域模型、领域语义、记录输入写入规则、字段规则、目标/主题/布局领域能力 |
| `app` | usecase、store、组合逻辑、跨 feature 应用流程 |
| `features` | 具体功能入口、功能 UI、功能专属状态和组件 |
| `platform` | Obsidian 适配器：Modal、Vault、Workspace、Events、SettingsTab |
| `shared` | 真正通用的 UI primitives、hooks、utils、icons、feedback |
| `styles` | 继续集中管理 CSS，不随组件移动到 feature 目录 |

## 4. V21 QuickInput

| 当前路径 | 目标路径 | 原因 |
|---|---|---|
| `src/app/ui/components/QuickInputEditor/**` | `src/features/quickinput/editor/**` | 快捷面板编辑器是 quickinput 功能 UI，不是 app-wide 组件 |
| `src/app/ui/components/QuickInputEditor/fields/**` | `src/features/quickinput/editor/fields/**` | 字段 renderer 只服务 QuickInput |
| `src/app/ui/components/QuickInputEditor/model/**` | `src/features/quickinput/editor/model/**` | editor model 是 QuickInput UI adapter，不是 core 领域模型 |
| `src/platform/obsidian/modals/QuickInputModalContent.tsx` | `src/features/quickinput/modal/QuickInputModalContent.tsx` | 业务 UI 离开 platform，platform 只留 Obsidian Modal 壳 |
| `src/platform/obsidian/modals/QuickInputModalHeader/Footer/ConflictRecoveryPanel.tsx` | `src/features/quickinput/modal/**` | Header、Footer、冲突恢复面板属于 QuickInput 弹窗业务 UI |
| `src/platform/obsidian/modals/useQuickInput*.ts` | `src/features/quickinput/modal/**` | modal hook 是 QuickInput 功能逻辑 |
| `src/app/actions/recordCreateActions.ts` | 暂留 `src/app/actions/recordCreateActions.ts` | 它是跨视图创建入口聚合，当前仍属于 app action；后续若引入 QuickInput capability port 再移动 |

V21 完成后，当前实际结构为：

```text
src/features/quickinput/editor/**
src/features/quickinput/modal/QuickInputModalContent.tsx
src/features/quickinput/modal/useQuickInputSubmit.ts
src/platform/obsidian/modals/QuickInputModal.tsx
```

其中 `src/platform/obsidian/modals/QuickInputModal.tsx` 只负责 Obsidian Modal 生命周期、资源路径注入、键盘检测和挂载 feature UI。

## 5. V22 Settings / Views

| 当前路径 | 目标路径 | 原因 |
|---|---|---|
| `src/shared/ui/views/**` | `src/features/settings/views/runtime/**` | Statistics / Excel / Timeline / Heatmap 是业务视图，不是 shared primitive |
| `src/features/settings/viewEditors/**` | `src/features/settings/views/editors/**` | 视图编辑器和视图运行时归属同一 settings 子领域 |
| `src/features/settings/viewModels/**` | `src/features/settings/views/models/**` | view model 不应散在 settings 根下 |
| `src/features/settings/components/LayoutEditorPanel.tsx` | `src/features/settings/layout/editor/LayoutEditorPanel.tsx` | 布局编辑属于 layout 子领域 |
| `src/features/settings/components/LayoutEditorControls.tsx` | `src/features/settings/layout/editor/LayoutEditorControls.tsx` | 同上 |

V22 完成后，视图运行时、编辑器、模型拥有统一 feature public：`@features/settings/views/public`。`shared/ui/public` 不再导出业务视图。`features/settings/components` 目前仍保留布局编辑面板，后续 V24/V25 再继续收窄。

## 6. V23 Core

V23 已完成第一批 Core ownership 收敛。本版重点是把 RecordInput 从 generic service bucket 中拿出来，并把任务记录 / 记录提交相关工具从 `core/utils` 放回对应领域。

| 原路径 | 现路径 | 原因 |
|---|---|---|
| `src/core/services/recordInput/**` | `src/core/recordInput/**` | RecordInput 是核心领域，不属于 generic services bucket |
| `src/core/utils/taskTime.ts` | `src/core/records/task/taskTime.ts` | 任务时间规则属于任务记录领域 |
| `src/core/utils/taskStatus.ts` | `src/core/records/task/taskStatus.ts` | 任务状态推导属于任务记录领域 |
| `src/core/utils/taskUtils.ts` | `src/core/records/task/taskUtils.ts` | 任务工具属于任务记录领域 |
| `src/core/utils/mark.ts` | `src/core/records/task/mark.ts` | 任务勾选、完成、周期规则属于任务记录领域 |
| `src/core/utils/recordSubmitFeedback.ts` | `src/core/recordInput/feedback.ts` | 记录提交反馈属于 RecordInput 领域 |
| `src/core/utils/recordSubmitRecovery.ts` | `src/core/recordInput/recovery.ts` | 记录冲突恢复属于 RecordInput 领域 |
| `src/core/utils/recordDebug.ts` | `src/core/recordInput/debug.ts` | 记录输入调试属于 RecordInput 领域 |
| `src/app/usecases/recordInput/workflows/**` | 保留在 `app/usecases` | 工作流是应用事务，不进入 core |

V23 仍刻意保留 `@core/utils/public` 对上述工具的再导出，原因是外层调用可以继续通过稳定 public facade 编译；但真实源码 ownership 已经不再位于 `core/utils`。后续 V25 再决定是否进一步缩窄 `@core/utils/public`。

本版不移动 `core/types/recordInput.ts` / `recordSnapshot.ts`，避免一次性牵动所有 RecordInput 类型导出。后续若继续整理类型，会以 `@core/recordInput/public` 为唯一外部入口。

## 7. V24 Shared / Platform

V24 已完成 Shared / Platform ownership 收窄。

| 原路径 | 现路径 | 原因 |
|---|---|---|
| `src/platform/*` | `src/platform/obsidian/*` | 当前唯一平台就是 Obsidian，目录名必须明确 |
| `src/platform/obsidian/public.ts` | 新增 | app / feature 需要平台入口时优先使用 platform facade |
| `src/shared/ui/items/**` | `src/features/settings/views/runtime/components/items/**` | TaskRow / BlockItem / ItemLink / FieldPill 是业务视图渲染器 |
| `src/shared/ui/heatmap/HeatmapCell.tsx` | `src/features/settings/views/runtime/components/heatmap/HeatmapCell.tsx` | HeatmapCell 属于 heatmap runtime view |
| `src/shared/ui/statistics/ChartBlock.tsx` | `src/features/settings/views/runtime/components/statistics/ChartBlock.tsx` | ChartBlock 属于 Statistics runtime view |
| `src/shared/ui/timeline/**` | `src/features/settings/views/runtime/components/timeline/**` | Timeline day-column 组件属于 Timeline runtime view |
| `src/shared/ui/composites/dialogs/NamePromptModal.ts` | 删除 | Obsidian Modal 不能通过 shared UI forwarder 暴露 |

V24 后 shared 的定位更窄：

```text
shared/ui/primitives
shared/ui/components
shared/ui/composites
shared/ui/icons
shared/ui/markdown
shared/hooks
shared/utils
```

业务视图组件从 shared 移出后，由 settings views runtime 内部相对导入，不再通过 `@shared/ui/public` 暴露。platform 根目录不再放适配器文件；所有具体 Obsidian 适配器都在 `src/platform/obsidian` 下。

## 8. V25 Schema / Release

V25 已执行当前版 schema 与目录预算锁定：

```text
只支持当前 settings schema
不做旧数据迁移
新增 schema:gate 并接入 gate / refactor:verify
folder ownership gate 接入主 gate
release 包边界继续只允许 manifest.json / main.js / styles.css
文档封版
```

V25 的发布包仍然只包含：

```text
manifest.json
main.js
styles.css
```

不包含：

```text
data.json
dist/
src/
docs/
test/
scripts/
node_modules/
```

## 9. 验收命令

V20 后新增：

```bash
npm run folder:map
npm run folder:verify
```

完整架构验收：

```bash
npm run refactor:verify
npm run gate
```

本地依赖齐全时再执行：

```bash
npm run typecheck
npm run build
```
