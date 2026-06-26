# Initial Engineering Plan Progress

This file tracks the original first-pass engineering plan and marks what has been completed through v1.0.9.

## Progress summary

| Area | Completion |
|---|---:|
| P0 release / safety / stability | 约 88% |
| P1 user experience / maintainability | 约 78% |
| P2 productization / long-term governance | 约 56% |
| 总体加权完成度 | 约 85% |

## Original plan with progress

| 优先级 | 修改性质 | 性价比 | 当前进度 | 状态 | 修改原因 | 涉及文件 | 已投入/预计用时 | 危险性 | 验收标准 | 最小 MVP 标准 |
|---|---|---:|---:|---|---|---|---:|---|---|---|
| P0 | 发布阻断修复 | 极高 | 100% | 基本完成 | 版本、插件身份、release 包命名和发布边界需要稳定 | `manifest.json`, `package.json`, `package-lock.json`, `scripts/build/package-release.mjs`, `scripts/gates/version-sync-gate.mjs`, `scripts/gates/manifest-gate.mjs`, `scripts/gates/release-boundary-gate.mjs` | 已投入约 2 天 | 低 | `version:gate`, `manifest:gate`, `release:check` 可阻断版本/身份漂移 | 能生成 `release/think-os-release.zip`，只包含必要发布文件 |
| P0 | 启动性能减负 | 高 | 70% | 部分完成 | Obsidian 插件启动不应被重扫描/重 IO 阻塞 | `src/main.ts`, `src/app/ServiceManager.ts`, `src/app/bootstrap/loadDataServices.ts` | 已投入约 1 天 / 仍需 1 天 | 中 | 首次加载不明显卡顿，扫描延后且失败不影响插件启用 | 数据扫描进入 idle/后台路径，命令和设置先可用 |
| P0 | AI 安全默认值调整 | 极高 | 100% | 基本完成 | 默认 endpoint/model/key 不能带个人或第三方痕迹，密钥保存必须用户主动选择 | `src/core/types/ai-schema.ts`, `src/features/settings/tabs/AiSettings.tsx`, `src/features/settings/tabs/*`, `data.example.json` | 已投入约 1.5 天 | 低 | AI 默认 disabled，endpoint/model/key 为空，`persistApiKey=false` | 不填 key 不发请求，不默认保存 key |
| P0 | AI 网络端口抽象 | 高 | 90% | 基本完成 | core 不应直接依赖 fetch/Obsidian，移动端需要统一传输适配 | `src/core/ai/AiHttpClient.ts`, `src/core/ai/AiHttpTransport.ts`, `src/platform/ObsidianAiHttpTransport.ts`, `test/unit/platform/obsidianAiHttpTransport.test.ts` | 已投入约 1.5 天 | 中 | core 只依赖 transport，运行时通过 Obsidian `requestUrl` | AI 请求由 platform transport 注入 |
| P0 | Vault 事件与扫描安全 | 高 | 75% | 部分完成 | 高频 create/modify 和异常扫描不应产生重复任务或未处理 rejection | `src/platform/events/VaultWatcher.ts`, `src/core/services/DataStore.ts` | 已投入约 1 天 / 仍需 0.5 天 | 中 | 高频修改有防抖，删除/重命名取消待扫描，异常可见 | watcher 有 catch、防抖和卸载保护 |
| P1 | QuickInput 拆分 | 极高 | 90% | 基本完成 | QuickInput 是主路径，Modal 不能长期承担提交、键盘、header/footer、预览等所有职责 | `src/platform/modals/QuickInputModal.tsx`, `src/platform/modals/useQuickInputSubmit.ts`, `src/platform/modals/QuickInputModalHeader.tsx`, `src/platform/modals/QuickInputModalFooter.tsx`, `src/platform/modals/*quickInput*` | 已投入约 3 天 | 中 | Modal shell <350 行，关键逻辑拆分 | 提交/删除/键盘/标题/footer/预览拆出 |
| P1 | QuickInput 表单验收体验 | 高 | 85% | 部分完成 | 用户应在提交前/失败时看到明确反馈，而不是只看到技术错误 | `src/app/ui/components/QuickInputEditor/components/*`, `src/core/utils/recordSubmitFeedback.ts`, `src/platform/modals/useQuickInputSubmit.ts` | 已投入约 2 天 / 仍需 1 天 | 中 | 单选可见、当前值高亮；冲突失败有可执行恢复按钮 | QuickInput 能稳定录入、编辑；冲突时不误关闭并提供恢复操作 |
| P1 | 设置页信息架构优化 | 高 | 70% | 部分完成 | 设置项密集，新用户需要更清楚的分区和安全提示 | `src/features/settings/tabs/AiSettings.tsx`, `src/features/settings/tabs/AiApiConfigSection.tsx`, `src/features/settings/tabs/AiPromptRulesSection.tsx`, `src/features/settings/tabs/AiScopeSection.tsx`, `src/features/settings/tabs/AiAdvancedSettingsSection.tsx` | 已投入约 2 天 / 仍需 1 天 | 低 | AI 设置分区清晰，保存/测试/风险状态可见 | AI 设置页不再是巨型组件 |
| P1 | `app/public.ts` 出口瘦身 | 中高 | 40% | 部分完成 | public 出口过宽会弱化架构边界 | `src/app/public.ts`, `scripts/gates/public-api-gate.mjs` | 已投入约 0.5 天 / 仍需 1.5 天 | 中 | public API 有 allowlist 和分组 | 现有调用兼容，后续逐步拆门面 |
| P1 | `recordUiActions.ts` 胖文件治理 | 高 | 100% | 基本完成 | 视图创建、编辑、任务状态、Excel 修改混在一起，后续维护风险高 | `src/app/actions/recordUiActions.ts`, `src/app/actions/recordCreateActions.ts`, `src/app/actions/recordEditActions.ts`, `src/app/actions/recordTaskActions.ts`, `src/app/actions/recordExcelActions.ts` | 已投入约 2 天 | 中 | `recordUiActions.ts` 仅作为兼容 barrel | 各类 action 独立维护，原导出不破坏 |
| P1 | 数据写入冲突 UX | 高 | 90% | 基本完成 | 记录路径/行号过期时用户需要知道如何恢复 | `src/core/utils/recordSubmitFeedback.ts`, `src/core/utils/recordSubmitRecovery.ts`, `src/platform/modals/QuickInputConflictRecoveryPanel.tsx`, `src/platform/modals/useQuickInputSubmit.ts`, `test/unit/recordSubmitFeedback.test.ts`, `test/unit/recordSubmitRecovery.test.ts` | 已投入约 2.5 天 / 仍需 0.5 天 | 高 | 冲突消息给出重新扫描/打开原文/重试保存按钮 | 冲突时不关闭编辑弹窗，并提供打开原文、重新扫描、重试保存 |
| P1 | 类型债治理 | 中高 | 35% | 尚未系统深入 | 裸 `any` 会影响大规模重构安全 | `src/app/actions/*`, `src/platform/modals/*`, `src/features/settings/*` | 已投入约 0.5 天 / 仍需 3 天 | 中 | 主路径不再出现不必要 `any` | 先治理 QuickInput、设置页、record actions 主路径 |
| P1 | CI 自动化 | 极高 | 100% | 基本完成 | 人工验证容易漏 gate/build | `.github/workflows/ci.yml`, `package.json` | 已投入约 1 天 | 低 | PR/push 跑验证和 release build | CI 至少跑 `verify:ci` 与 `build:release` |
| P2 | Bundle 体积治理 | 中高 | 78% | 部分完成 | Obsidian 插件启动体验受 bundle 体积影响 | `vite.config.ts`, `scripts/gates/bundle-budget-gate.mjs`, `scripts/gates/no-mui-icons-gate.mjs`, `scripts/audit/bundle-size-report.mjs`, `src/shared/ui/icons/index.tsx`, `README.md` | 已投入约 2.5 天 / 仍需 1 天 | 中 | release 模式压缩，有 raw/gzip 预算和报告，MUI icons 不进入运行时 bundle | `release:check` 阻断体积超标，`gate` 阻断 MUI icons 回归 |
| P2 | CSS / MUI 主题一致性 | 中 | 40% | 部分完成 | MUI 固定色值和 Obsidian 主题变量可能冲突 | `src/shared/styles/mui-theme.ts`, `src/shared/styles/*.css`, `src/shared/styles/modals.css`, `src/shared/ui/icons/index.tsx` | 已投入约 1 天 / 仍需 1.5 天 | 低 | light/dark/高对比主题下可读 | QuickInput 基础控件和本地图标使用 Obsidian 变量 |
| P2 | 端到端用户路径验收 | 高 | 55% | 部分完成 | 需要以真实用户路径保证可发布，而不是只有内部单测 | `docs/MVP_ACCEPTANCE.md`, `scripts/gates/mvp-acceptance-gate.mjs`, `.github/workflows/ci.yml` | 已投入约 1.5 天 / 仍需 2 天 | 中 | 有 MVP 文档和静态门禁；后续补 WDIO 主路径 | 新用户路径被文档化并进入 gate |
| P2 | 文档与代码同步治理 | 中 | 75% | 部分完成 | 文档很多，需要明确 README、MVP 和变更记录的入口 | `README.md`, `docs/MVP_ACCEPTANCE.md`, `FIRST_PASS_CHANGES.md` 至 `EIGHTH_PASS_CHANGES.md`, `doc/index.html` | 已投入约 2.5 天 / 仍需 0.5 天 | 低 | README 说明开发/发布/验收入口；每版有变更记录 | 开发者能按 README 完成验证和发布 |

## Remaining highest-value work

1. Harden the new in-modal recovery flow with WDIO coverage and visual regression checks.
2. Add WDIO smoke coverage for the full QuickInput path.
3. Continue dependency-level size comparison after a real release build.
4. Continue type debt cleanup in QuickInput, settings, and app public boundaries.
