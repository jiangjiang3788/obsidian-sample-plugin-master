# Think OS Energy 1.0.31

当前 Energy 版本重点：数据质量、推荐可信度、周期复盘收口。详见 `ENERGY_1_0_31_DATA_QUALITY.md` 与 `SOURCE_VALIDATION_1.0.31.md`。

# Think OS (Obsidian Plugin)

一个基于 Preact 的 Obsidian 仪表盘/效率工具插件（插件 id: `think-os`）。

## 功能概览

- Dashboard：以视图形式组织插件 UI（Preact）。
- Timer：计时器管理（含命令：停止并写回等）。
- Quick Input / AI Input / AI Chat：输入与对话相关能力（见 `src/features/*`）。Quick Input 中的 single-select options 会直接显示为可点击选项，不再隐藏在下拉列表里，当前选中值会突出显示；编辑保存遇到记录定位冲突时，会显示 conflict recovery actions，支持打开原文、重新扫描和重试保存。
- Thinktxt 预览渲染：将连续的 `[!thinktxt]` callout 在预览模式合并渲染为只读表格。

> 具体能力以代码为准：`src/features/`、`src/app/`。

## 安装（手动）

Obsidian 第三方插件的最小发布物是：

- `manifest.json`
- `main.js`
- `styles.css`

将上述文件复制到你的 Vault 目录：

`<你的Vault>/.obsidian/plugins/think-os/`

然后在 Obsidian 中启用插件即可。

## 开发

### 环境

- Node.js + npm
- Windows/ macOS/ Linux 均可（本仓库当前在 Windows 路径下开发也没问题）

### 常用命令

```bash
npm ci
npm run gate
npm run manifest:gate
npm run mvp:gate
npm run bundle:gate  # 需要先 npm run build:release 生成 release/think-os/main.js
npm run bundle:report # 生成 release/think-os-bundle-report.json/.md，便于追踪体积变化
npm run no-mui-icons:gate # 阻止重新引入 @mui/icons-material 运行时依赖
npm run typecheck:src
npm run test:unit
npm run build
npm run docs:index
```

- `npm run build` 会构建到 `dist/`，并把产物复制到仓库根目录的 `main.js`/`main.js.map`/`styles.css`（便于直接调试/拷贝）。
- `npm run build:release` 会产出最小发布包：`release/think-os/` 和 `release/think-os-release.zip`，并使用 release 模式压缩 `main.js`。
- `npm run manifest:gate` 会检查 `manifest.json` 是否与包名、版本和发布入口保持一致。
- `npm run mvp:gate` 会检查最小可发布路径的静态验收条件，例如 AI 安全默认值、QuickInput/Record Actions 拆分状态、CI 和 release 命令是否存在。
- `npm run bundle:gate` 会检查发布包里的 `main.js` 体积预算；默认阈值是 raw 1.2 MiB、gzip 380 KiB，可用 `THINK_OS_MAX_BUNDLE_BYTES` / `THINK_OS_MAX_GZIP_BUNDLE_BYTES` 临时覆盖，但需要代码评审。
- `npm run bundle:report` 会生成 `release/think-os-bundle-report.json` 和 `release/think-os-bundle-report.md`，用于记录 `main.js`、`styles.css`、manifest 和 release zip 的 raw/gzip 体积。
- `npm run no-mui-icons:gate` 会阻止源码、`package.json` 和 lockfile 重新引入 `@mui/icons-material`，运行时图标统一走 `src/shared/ui/icons` 的本地轻量组件。




### 图标与 Bundle 体积约定

运行时不要直接 import `@mui/icons-material/*`。插件常用图标对 app/features/platform 统一从 `@shared/public` 引入，shared 内部由 `@shared/ui/icons` 维护，本地组件使用 Obsidian CSS 变量和轻量文本/SVG-like glyph，避免把 MUI icons 包打进 `main.js`。新增图标前优先扩展 `src/shared/ui/icons/index.tsx`，并运行：

```bash
npm run no-mui-icons:gate
npm run gate
```

### Quick Input 单选交互约定

Quick Input 里的 `radio`、`select`、`singleSelect`，以及带 options 的 `path` 字段，都应该把 single-select options 直接渲染为可点击 pill。不要在主录入路径里使用下拉列表隐藏选项；当前选中值必须有明显高亮，并显示 `当前：...` 的辅助说明。


### Quick Input 冲突恢复约定

Quick Input 编辑模式如果遇到记录路径、行号或块边界冲突，弹窗不应立即关闭，也不应只显示一次性 Notice。界面必须展示 conflict recovery actions：

- 打开原文：帮助用户确认旧记录是否仍存在。
- 重新扫描：按失败结果里的受影响路径刷新 DataStore。
- 重试保存：用户完成检查或扫描后可直接继续保存。

相关实现位于 `src/platform/modals/QuickInputConflictRecoveryPanel.tsx`、`src/platform/modals/useQuickInputSubmit.ts` 和 `src/core/utils/recordSubmitRecovery.ts`。

### AI HTTP 传输层

AI 请求在 core 层只依赖 `AiHttpTransport` 接口；Obsidian 环境由 `src/platform/ObsidianAiHttpTransport.ts` 通过 `requestUrl` 适配。这样可以避免桌面端/移动端 `fetch` 差异，同时保留测试或未来代理传输的可替换性。

### 依赖治理

本轮已清理无直接引用的旧依赖，并补齐 e2e / 文档索引脚本的直接 dev 依赖。依赖变更后请优先执行：

```bash
npm ci
npm run typecheck:src
npm run test:unit
npm run build
npm run docs:index
```

注意：`@emotion/react` 和 `@emotion/styled` 虽然项目代码不直接 import，但属于 MUI 默认 styled engine 的受保护依赖，不要按静态扫描误删。

### 将构建产物拷贝到 Vault（示例：PowerShell）

```powershell
$vault = "D:\ObsidianVault"
$pluginDir = Join-Path $vault ".obsidian\plugins\think-os"
New-Item -ItemType Directory -Force -Path $pluginDir | Out-Null
Copy-Item -Force manifest.json, main.js, styles.css $pluginDir
```

## 项目结构（简述）

- `src/main.ts`：Obsidian 插件入口（生命周期、命令注册、DI 容器初始化）。
- `src/platform/`：Obsidian API 适配层（Vault/UI/Modal/Events 等端口实现）。
- `src/core/`：核心领域与跨 feature 能力（含 settings、storage、ports 等）。
- `src/features/`：功能模块（timer / quickinput / aiinput / aichat / settings ...）。
- `src/shared/`：跨模块共享工具与公共 UI（按 public/private 约束组织）。
- `scripts/gates/`：阻断式架构与质量门禁。
- `scripts/audit/`：非阻断审计、指标和覆盖报告。
- `scripts/docs/`：文档索引生成脚本。
- `scripts/build/`：构建后处理脚本。
- `文档/`：HTML 文档系统，包含项目管理、功能设计、技术文档、评审中心、维护发布。

## 相关文档

当前正式文档入口是 `文档/index.html`。建议先按这个顺序阅读：

1. `文档/01-项目管理/00-计划与路线/当前代码架构快照.html`
2. `文档/01-项目管理/02-实施计划/工程稳定化ABC实施计划.html`
3. `文档/01-项目管理/02-实施计划/实施计划-PhaseB脚本目录整理.html`
4. `文档/01-项目管理/00-计划与路线/版本路线图.html`
5. `文档/01-项目管理/00-计划与路线/目标闭环开发拆解.html`
6. `文档/05-维护发布/00-测试验收/当前测试基线.html`

`src/docs/` 仅保留代码旁说明；`docs/MVP_ACCEPTANCE.md` 是代码包级别的最小发布验收清单，用于补充正式 HTML 文档体系。



## 验证入口

```bash
npm run verify:fast
npm run mvp:gate
npm run verify
npm run verify:ci
```

脚本目录按 `scripts/gates`、`scripts/audit`、`scripts/docs`、`scripts/build`、`scripts/maintenance` 维护。

## Energy 1.0.15 Apple Quick Capture

This source package adds the versioned `obsidian://thinkos-energy` protocol for iPhone Shortcuts/Widgets. See `docs/ENERGY_APPLE_QUICK_CAPTURE_1.0.15.md` for setup. The plugin keeps Goal/time/Markdown generation inside Think OS; Apple Shortcuts only send a validated energy intent.

## Energy 1.0.16 Goal Integration

Energy is now visible as a dedicated Goal state summary while remaining outside Goal XP/level progression. Desktop Energy capture also uses the configured default Energy Goal when no current Goal context exists. See `docs/ENERGY_1_0_16_STATUS.md`.

## Energy 1.0.17 Runtime Context

Energy samples now resolve conservative, runtime-only nearby activity context and same-day sleep/body/exercise background signals under the same Goal. Inferred context is never written back as a cause. See `docs/ENERGY_1_0_17_CONTEXT.md` and `SOURCE_VALIDATION_1.0.17.md`.


## Energy 1.0.18 Sparse Timeline

Goal Energy includes a sparse 7-day timeline, explicit Missing days, coverage, realtime/retrospective counts, and detailed brain/physical dimensions. Missing is never coerced to zero. See `docs/ENERGY_1_0_18_TIMELINE.md`.

## Energy 1.0.19 Recovery / Depletion Candidate Analytics

Completed task intervals can now be conservatively paired with nearby before/after Energy observations. Goal Energy shows activity/theme/duration aggregates, overall/brain/physical deltas, sample N, high-confidence pair counts and small-sample protection. The analysis is explicitly observational, not causal. See `docs/ENERGY_1_0_19_EFFECTS.md` and `SOURCE_VALIDATION_1.0.19.md`.

## Energy 1.0.20 — First-class EnergyView

Energy is now a first-class Dashboard view instead of being hidden inside expanded Progress cards. Choose **精力 / EnergyView** as a view type to see per-Goal latest Energy, brain/physical dimensions, sparse timeline and Missing coverage, recent runtime context, and recovery/depletion observations. The EnergyView module-header create action opens QuickInput directly in Energy mode. ProgressView now keeps only a lightweight Energy summary. See `docs/ENERGY_1_0_20_VIEW.md` and `SOURCE_VALIDATION_1.0.20.md`.

## Energy 1.0.21 — Rhythm / Lag / Continuous Work / Stop Proxy

EnergyView now includes configurable 7–90 day temporal observations: daypart rhythm, +6h/+12h/+24h real-sample lag, continuous-work duration buckets, and a transparent high-Energy stopping proxy. Missing target samples stay Missing; observations remain non-causal and are not written back to Markdown. See `docs/ENERGY_1_0_21_PATTERNS.md` and `SOURCE_VALIDATION_1.0.21.md`.

## Energy 1.0.22 — Evidence-gated Energy Management

EnergyView now converts existing personal observations into conservative current-state management cues: recovery candidates, depletion/caution candidates, brain/physical dimension emphasis, preserve-capacity guardrails, and long-session defense. Personalized candidates require repeated stable evidence (`N>=3`); missing or insufficient data produces an explicit no-suggestion state. A synthetic `demo/ThinkOS Energy Demo/` dataset is included so the full Energy UI can be exercised immediately. See `docs/ENERGY_1_0_22_MANAGEMENT.md` and `SOURCE_VALIDATION_1.0.22.md`.


## Energy 1.0.23 — Weekly Review + N-of-1 Experiment

EnergyView now includes a day-balanced recent-week review plus one lightweight configurable N-of-1 experiment slot. Weekly summaries preserve Missing, retain sample/evidence gates, and reduce recording-density bias by averaging day means rather than letting high-frequency capture days dominate. Experiments compare the N days before an intervention date with the N days after it and stay `collecting` until both periods reach at least 3 sampled days and N>=5. See `docs/ENERGY_1_0_23_WEEKLY_EXPERIMENT.md` and `SOURCE_VALIDATION_1.0.23.md`.

## Energy 1.0.24 — Visual-first EnergyView

EnergyView now uses a visual-first hierarchy: a weekly map with **date on the horizontal axis and time on the vertical axis**, a selected-sample side card, three concise insight cards, and a collapsed advanced-statistics section. Missing days stay visually empty, realtime/retrospective points remain distinguishable, and all 1.0.18–1.0.23 analytics remain available on demand. The top `记录精力` action opens the existing `core.energy` QuickInput with the current Goal context. See `docs/ENERGY_1_0_24_UI_REFRESH.md` and `docs/SOURCE_VALIDATION_1.0.24.md`.

## Energy 1.0.25 — Period-aware map + recommendation foundation

EnergyView now follows the Dashboard period: **day = horizontal time**, **week/month = date × time**, **quarter/year = one habit-like daily point**. Energy is encoded primarily by point size, connectors are removed, selected-node detail is simplified, and Progress/Growth no longer contains Energy UI. A pure storage-agnostic recommendation ranker is also introduced as the boundary for the next Task/Plan/Habit recommendation feature. See `ENERGY_1_0_25_PERIOD_UI.md` and `ENERGY_RECOMMENDATION_NEXT.md`.

## Energy 1.0.30 note

This source package includes the Energy 1.0.30 recovery-learning update and the JSX Unicode rendering fix. See `ENERGY_1_0_30_RECOVERY_LEARNING.md` and `SOURCE_VALIDATION_1.0.30.md`.
