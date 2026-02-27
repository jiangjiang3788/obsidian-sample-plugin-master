# 目录规范（MVP 版：先定规矩 + 增量整理）

> 目标：不做全仓搬家，只做**规则落地** + 关键模块增量整理（只搬家 + 改 import，不改逻辑）。
> 
> 原则：**只移动文件 + 更新 import**，不改业务逻辑；每一步都能 `npm run build && npm run gate && npm run test:unit`。

## 1. 总体分层

### app
- `src/app/*`：组合根（buildRuntime）、store、usecases、跨 feature 的系统能力。
- `src/app/public.ts`：对外出口（features/platform 只能从这里拿 app 能力）。

### shared
- `src/shared/*`：跨功能可复用能力。
- `src/shared/public.ts`：shared 对外出口。**禁止 features/platform 深导入 shared 内部路径**。

### features
- `src/features/<feature>/*`：具体业务功能。
- feature 内可有 `components/ hooks/ utils/ viewModels/` 等，但**不要跨 feature 互相深导入**。

### platform
- `src/platform/*`：Obsidian 适配层（ports adapter、UI port、modal port、events adapter）。


## 2. 组件/模块目录形态

对“非 trivial”的组件统一目录形态：

```
Foo/
  FooContainer.tsx     // 只做状态选择、usecases/ports 调用、事件处理
  FooView.tsx          // 纯渲染（props-only）
  components/          // 子组件（纯渲染）
  hooks/               // UI 交互 hooks（无 ports）
  utils/               // 纯函数
  index.ts             // 对外统一出口（可选）
```

约束：
- **View 不读 store、不 resolve、不触 ports**（只用 props）。
- Container 使用 `useSelector(selectXxx)` 拿最小 state。


## 3. import 收口规则（必须遵守）

### 3.1 shared 只能从 public 出口引
- ✅ `import { ThemeTreeSelect } from '@shared/public'`
- ❌ `import { ThemeTreeSelect } from '@/shared/components/ThemeTreeSelect'`

由 `scripts/shared-public-gate.mjs` 强制。

### 3.2 app 能力只从 app/public 引
- ✅ `import { useSelector, selectAiSettings } from '@/app/public'`
- ❌ `import { useSelector } from '@/app/store/useSelector'`

### 3.3 feature 内部的相对路径要短
- feature 内推荐 `@/features/<feature>/...` 或同目录相对路径。
- 避免 `../../../../`。


## 4. 本次 MVP 增量整理范围

### 4.1 ThemeTreeSelect
目标：把相关文件放进单一目录，入口从 shared/public 暴露。

推荐结构：
```
src/shared/components/ThemeTreeSelect/
  ThemeTreeSelect.tsx
  ThemeTreeSelectPanel.tsx
  ThemeTreeNodeItem.tsx
  types.ts
  index.ts
```

并在 `src/shared/public.ts` 里统一 re-export：
- `export * from './components/ThemeTreeSelect';`


### 4.2 QuickInputEditor
目标：把拆分后的 Container/View/子组件收拢到目录，避免平铺散落。

推荐结构：
```
src/app/ui/components/QuickInputEditor/
  QuickInputEditorContainer.tsx
  QuickInputEditorView.tsx
  components/
    Fields.tsx
    ThemeSelector.tsx
  index.ts
```

外部引用保持稳定：
- `src/app/ui/components/QuickInputEditor.tsx` 可以保留为**薄 re-export**（兼容旧 import），内部转发到新目录。

### 4.3 StatisticsView
推荐结构：
```
src/shared/ui/views/StatisticsView/
  StatisticsViewContainer.tsx
  StatisticsViewView.tsx
  views/
    DayStatisticsView.tsx
    WeekStatisticsView.tsx
    MonthStatisticsView.tsx
    QuarterStatisticsView.tsx
    YearStatisticsView.tsx
  components/
    PopoverContent.tsx
    TopControls.tsx
  types.ts
  index.ts
```
外部入口保持稳定：
- `src/shared/ui/views/StatisticsView.tsx` 保留为薄 re-export。

### 4.4 TimelineView / EventTimelineView
推荐结构：
```
src/shared/ui/views/TimelineView/
  TimelineViewContainer.tsx
  TimelineViewView.tsx
  index.ts

src/shared/ui/views/EventTimelineView/
  EventTimelineViewContainer.tsx
  EventTimelineViewView.tsx
  index.ts

src/shared/ui/views/timeline/components/
  TimelineSummaryTable.tsx
```
外部入口保持稳定：
- `src/shared/ui/views/TimelineView.tsx`、`src/shared/ui/views/EventTimelineView.tsx` 保留为薄 re-export。

### 4.5 shared/ui/components 与 shared/ui/primitives
目的：补齐目录出口，便于 `@shared/public` 收口。

```
src/shared/ui/components/index.ts
src/shared/ui/primitives/index.ts
```


## 5. 提交粒度（建议）

推荐拆成 3~5 个 commit，确保每一步都可编译/可 gate：

1) shared/ui 的 index 出口 + shared/public 收口。
2) ThemeTreeSelect 目录整理：移动文件 + 更新 import。
3) QuickInputEditor 目录整理：移动文件 + 更新 import + 保留薄 re-export。
4) StatisticsView 目录整理（如本次纳入）。
5) TimelineView / EventTimelineView 目录整理（如本次纳入）。

每个 commit 后都跑：
- `npm run build`
- `npm run gate`
- `npm run test:unit`

