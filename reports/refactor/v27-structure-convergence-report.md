# V27 Structure Convergence - 大文件职责拆分版

## 本版定位

V27 接在 V26 语义函数收敛之后，重点不再继续扩大业务语义迁移，而是处理最明显的“职责过宽文件”。

本版原则：

- 保留旧 import path，不破坏外部调用方。
- 只拆 facade 周围的内聚子模块，不做全项目目录搬家。
- 不改业务行为，只移动结构、抽出生命周期/交互/样式配置/错误处理职责。
- 所有新增模块必须归入当前 ownership：`app/ui/primitives`、`shared/styles`、`shared/utils`。

## 改造范围

### 1. FloatingPanel 拆分

原文件：

- `src/app/ui/primitives/FloatingPanel.tsx`：477 行

V27 后：

- `src/app/ui/primitives/FloatingPanel.tsx`：212 行，只保留 public facade + 状态编排 + render shell
- `src/app/ui/primitives/FloatingPanel.types.ts`：props 类型
- `src/app/ui/primitives/FloatingPanelHeader.tsx`：header / drag region / close button
- `src/app/ui/primitives/FloatingPanelResizeHandles.tsx`：desktop/mobile resize handles
- `src/app/ui/primitives/floatingPanelEvents.ts`：DOM event cast helper
- `src/app/ui/primitives/useFloatingPanelInteractions.ts`：drag / resize / focus interactions
- `src/app/ui/primitives/useFloatingPanelLifecycle.ts`：register/unregister、viewport clamp、outside click、ESC、localStorage persistence

拆分后职责：

| 模块 | 职责 |
|---|---|
| `FloatingPanel.tsx` | public facade、props 默认值、状态组合、portal render |
| `FloatingPanel.types.ts` | 对外 props 类型 |
| `FloatingPanelHeader.tsx` | 头部 UI 与关闭按钮 |
| `FloatingPanelResizeHandles.tsx` | resize handle UI |
| `useFloatingPanelInteractions.ts` | pointer drag/resize 交互状态机 |
| `useFloatingPanelLifecycle.ts` | DOM side effects 与持久化 |
| `floatingPanelGeometry.ts` | 几何计算与 style builder |
| `floatingPanelEvents.ts` | DOM listener/event 类型桥 |

### 2. MUI theme bridge 拆分

原文件：

- `src/shared/styles/mui-theme.ts`：466 行

V27 后：

- `src/shared/styles/mui-theme.ts`：compatibility facade，只保留历史 import path
- `src/shared/styles/muiTheme/index.ts`：`createThinkMuiTheme()` 组合入口
- `src/shared/styles/muiTheme/palette.ts`：light/dark fallback palette
- `src/shared/styles/muiTheme/typography.ts`：typography tokens
- `src/shared/styles/muiTheme/components.ts`：component overrides 聚合
- `src/shared/styles/muiTheme/controlComponents.ts`：Button / IconButton
- `src/shared/styles/muiTheme/formComponents.ts`：Input / Label / Checkbox / Radio / Switch
- `src/shared/styles/muiTheme/surfaceComponents.ts`：Paper / Card / Chip / Accordion
- `src/shared/styles/muiTheme/navigationComponents.ts`：Tabs / Tab / MenuItem / Divider
- `src/shared/styles/muiTheme/overlayComponents.ts`：Dialog / Tooltip
- `src/shared/styles/muiTheme/feedbackComponents.ts`：Alert
- `src/shared/styles/muiTheme/types.ts`：MUI bridge 类型

兼容性：

- `createThinkMuiTheme` 仍从 `src/shared/styles/mui-theme.ts` 导出。
- `theme` legacy export 仍保留。
- CSS governance gate 需要的 V2 contract marker 保留在 facade 文件中。

### 3. ErrorHandler 拆分

原文件：

- `src/shared/utils/errorHandler.ts`：436 行

V27 后：

- `src/shared/utils/errorHandler.ts`：compatibility facade
- `src/shared/utils/error/index.ts`：public exports + singleton helpers
- `src/shared/utils/error/types.ts`：`ErrorType`、`ErrorHandlerOptions`、`ErrorLogEntry`
- `src/shared/utils/error/errors.ts`：`BaseError` 与自定义错误类
- `src/shared/utils/error/classification.ts`：错误分类
- `src/shared/utils/error/messages.ts`：用户友好错误文案
- `src/shared/utils/error/logging.ts`：dev console 输出
- `src/shared/utils/error/ErrorHandler.ts`：单例状态、日志数组、安全执行

额外收益：

- `ErrorLogEntry.details` 从 `any` 改为 `unknown`。
- V8 `captureStackTrace` 不再使用 `as any`。
- 错误处理从“大工具类”拆成类型、错误类、分类、消息、日志、handler 六个角色。

## 指标变化

| 指标 | V26 | V27 |
|---|---:|---:|
| src files | 698 | 722 |
| src lines | 70,829 | 71,008 |
| TS-like lines | 63,578 | 63,757 |
| files >= 500 lines | 0 | 0 |
| non-CSS files >= 500 lines | 0 | 0 |
| TS-like files >= 450 lines | 2 | 0 |
| TSX files >= 350 lines | 2 | 1 |
| explicit any | 657 | 653 |
| duplicate function-name groups | 50 | 50 |

说明：本版文件数量和总行数上升，是 deliberate split。收益不是“少几行”，而是把 3 个大职责桶拆成 facade + 子模块，降低后续维护和扩展冲突。

## 当前最大热点

V27 后最大的 TS-like 文件已经不再是 FloatingPanel / mui-theme / errorHandler，而变成：

| 文件 | 行数 | 下版建议 |
|---|---:|---|
| `src/core/config/viewConfigs.ts` | 421 | V28 拆 view defaults/export configs |
| `src/features/settings/theme/ThemeManager.ts` | 405 | V29 拆 theme matching ownership |
| `src/app/actions/recordCreateActions.ts` | 399 | V28 拆 create action per source/view |
| `src/core/services/ItemService.ts` | 388 | V29 拆 item mutation services |
| `src/app/usecases/layout.usecase.ts` | 373 | V29/V30 再评估 usecase facade |

## 完整深度收敛计划表

| 版本 | 主题 | 核心目标 | 主要动作 | 验收标准 |
|---|---|---|---|---|
| V26 | Semantic Function Convergence | 收敛散落语义函数 | 收 `compactText`、`normalizeToken`、`normalizeMultiValue`、theme path、timing 等 | gate 通过；explicit any 下压；语义中心建立 |
| V27 | Structure Convergence | 拆职责过宽文件 | 拆 `FloatingPanel`、`mui-theme`、`errorHandler`，保留 facade | TS-like >=450 从 2 降到 0；gate 通过 |
| V28 | View Config / Action Convergence | 收敛 view 配置桶和创建动作桶 | 拆 `viewConfigs.ts`、`recordCreateActions.ts` | config/action facade 变薄；创建入口回归通过 |
| V29 | Service Ownership Convergence | 明确 service ownership | 拆 `ItemService.ts`；拆 `ThemeManager` 算法与 UI ownership | core 不依赖 feature；service facade 变薄 |
| V30 | Type Debt Convergence | 压 `any` 热点 | 处理 heatmap/timeline/statistics view model、RecordNormalizer、ActionService、RecordInputFacade | explicit any <= 600；新增更严格预算 |
| V31 | Budget / Gate Finalization | 把结构固化成规则 | 更新文档、预算 baseline、acceptance checklist、release gate | gate/typecheck/build/test 全通过；收敛规则可持续 |

## 设计阶段开发提示词模板

### 模板 1：新功能设计前的 ownership 提示词

```text
你是这个项目的架构守门人。我要设计一个新功能：{功能名称}。
请先不要写代码，先输出设计审查：
1. 这个功能属于 core / app / features / platform / shared 哪一层？为什么？
2. 领域语义、用例编排、UI 展示、平台适配分别应该放在哪里？
3. 是否已有相同语义函数或 public facade 可以复用？请列出候选模块。
4. 哪些逻辑不能放进 shared？哪些逻辑不能放进 core？
5. 给出建议目录结构、文件职责和每个文件的最大行数预算。
6. 给出 import 方向约束：允许依赖什么，禁止依赖什么。
7. 给出验收 gate：typecheck/build/test/gate 之外，还要检查哪些指标？
``` 

### 模板 2：写代码前的防发散提示词

```text
请按“先设计，后实现”的方式开发 {功能名称}。
硬性约束：
- 不新增 root public 大桶导出，优先使用模块 public facade。
- 不在 shared 放业务语义；shared 只放纯 UI、通用 hook、通用 utils。
- 不在 feature 内重复 core 已有语义函数。
- 单文件超过 300 行必须解释，超过 380 行必须拆分。
- 新增函数前先搜索是否已有同义函数；如果已有，复用或扩展中心语义。
- 文件必须是 facade / model / view / adapter / service / semantics / utils 中明确一种角色。
- 不允许一个文件同时承担 UI、持久化、平台适配、领域规则四种职责。
请先输出文件结构和职责表，等设计通过后再给代码。
```

### 模板 3：AI 生成代码后的自检提示词

```text
请审查刚才生成的代码，不要继续写新功能。
按以下清单检查：
1. 是否产生重复语义函数？列出所有 normalize / parse / build / resolve / ensure / compact / map 函数。
2. 是否有大文件趋势？列出新增和修改文件行数。
3. 是否破坏层级依赖？core 是否依赖 app/features/platform？shared 是否依赖 app/core 业务？
4. 是否应该抽成 semantics/model/adapter/hook？
5. 是否出现 any、as any、unknown 未收窄？
6. 是否有 import path 绕过 public facade？
7. 是否有旧 facade 需要保留兼容？
8. 给出最小修复 patch，而不是重写整块代码。
```

### 模板 4：新增模块的固定结构提示词

```text
为 {模块名} 生成代码时，请强制遵守这个结构：
- public.ts / index.ts 只导出稳定 API，不写业务逻辑。
- types.ts 只放类型。
- semantics.ts 只放领域判断、归一化、解析、映射。
- model.ts 只放状态模型和纯计算。
- useXxx.ts 只放 hook 和副作用。
- XxxView.tsx 只放展示，不直接写持久化和平台 API。
- XxxService.ts 只放领域服务，不直接 import UI。
- adapter.ts 只连接平台或第三方库。
如果某个文件需要超过 300 行，请先拆分再输出。
```

### 模板 5：提交前收敛提示词

```text
请作为 reviewer 检查这次提交是否会制造后期整理成本。
输出：
1. 新增文件职责表。
2. 修改文件行数变化。
3. 新增/修改函数清单，标记是否已有同义实现。
4. import 依赖方向图。
5. 可能变成大文件的风险点。
6. any / as any 变化。
7. 必须补的测试和 gate。
8. 是否建议本次拆成多个 commit。
最后给出结论：可合并 / 需要先拆分 / 需要重新设计。
```

## 验证

已通过：

```bash
npm run gate
npm run refactor:verify
npm run refactor:metrics -- --output reports/refactor/refactor-metrics-v27.json --markdown reports/refactor/refactor-metrics-v27.md
npm run refactor:hotspots -- --output reports/refactor/refactor-hotspots-v27.json --markdown reports/refactor/refactor-hotspots-v27.md
```

已尝试：

```bash
npm run typecheck
```

但当前源码包没有 `node_modules`，因此缺少 `@types/node`、`preact`、`vite/client` 类型定义，typecheck 在依赖类型解析阶段中止。建议本地执行：

```bash
npm ci
npm run typecheck
npm run build
npm run test:unit
npm run gate
```

## V28 建议

V28 建议处理：

1. `src/core/config/viewConfigs.ts`
2. `src/app/actions/recordCreateActions.ts`

目标是把 view defaults / export configs / create modal actions 拆开，让 config 和 action 不再继续横向膨胀。
