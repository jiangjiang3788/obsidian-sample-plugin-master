# Think OS 开发文档（开发者向）

版本说明：与当前仓库 HEAD 提交 ad4c330 对齐  
适用范围：本仓库（Preact + TypeScript + Obsidian 插件）

---

## 1. 项目概览

- 名称：Think OS（Obsidian 插件）
- 核心特性：仪表板、快速输入、计时器、设置面板、主题矩阵等
- 技术栈：
  - UI：Preact（通过 preact/compat 兼容 React 生态）
  - 构建：Vite（CJS 输出，external obsidian）
  - 语言：TypeScript（严格模式）
  - 依赖注入：TSyringe（配合 ServiceManager 手动编排）
  - 状态：自研发布-订阅 Store（轻量）

主要文件：
- 插件入口：src/main.ts
- 插件清单：manifest.json（main 指向 main.js，styles 指向 styles.css）
- 构建配置：vite.config.ts
- 类型/路径：tsconfig.json
- 架构文档：ARCHITECTURE.md
- 用户向说明：README.md

依赖概要（package.json）：
- 运行时：preact、react/react-dom（经 preact/compat）、tsyringe、immer、dayjs、MUI Icons、@dnd-kit
- Dev：vite、@preact/preset-vite、jest、jest-environment-jsdom、wdio、obsidian 类型等

---

## 2. 快速开始

环境要求：
- Node.js ≥ 16、npm ≥ 7、Obsidian ≥ 0.15.0

安装与开发：
```bash
npm install
npm run dev
```

测试：
```bash
npm test
# or
npm run test:unit
npm run test:integration
npm run test:performance
npm run test:e2e
npm run test:coverage
```

构建：
```bash
npm run build
# 输出：dist/main.js（CJS）
```

部署到 Obsidian（手动）：
1) 构建后，将以下文件复制到 <vault>/.obsidian/plugins/think-os/  
   - dist/main.js  
   - manifest.json（位于仓库根目录，构建不会自动复制）  
   - styles.css（可选；若存在）
2) 在 Obsidian 中重载或重启并启用插件

注：manifest.json 的 styles 指向 styles.css，仓库未必提供独立 CSS 文件。当前全局样式主要由 GLOBAL_CSS 动态注入（见第 6 节）。若需要独立 CSS，请自行生成并保持路径一致。

---

## 3. 目录结构（与实际仓库对齐）

```
src/
├─ main.ts                    # 插件入口（生命周期、DI、服务懒加载、命令注册、CSS注入）
├─ core/
│  ├─ domain/                 # 领域模型（ThinkSettings/Theme 等）
│  │  ├─ constants.ts
│  │  ├─ definitions.ts
│  │  ├─ fields.ts
│  │  ├─ index.ts
│  │  ├─ schema.ts
│  │  └─ theme.ts
│  ├─ services/               # 核心服务
│  │  ├─ ActionService.ts
│  │  ├─ dataStore.ts
│  │  ├─ RendererService.ts
│  │  ├─ TimerService.ts
│  │  ├─ TimerStateService.ts
│  │  ├─ inputService.ts
│  │  ├─ taskService.ts
│  │  ├─ ThemeManager.ts
│  │  ├─ types.ts             # AppToken / SETTINGS_TOKEN
│  │  └─ index.ts
│  └─ utils/                  # 工具函数（array 等）
├─ features/
│  ├─ index.ts
│  ├─ dashboard/
│  │  ├─ index.ts
│  │  ├─ hooks/
│  │  ├─ styles/
│  │  │  └─ global.ts         # GLOBAL_CSS（入口注入）
│  │  ├─ ui/
│  │  │  └─ StatisticsView.tsx 等
│  │  └─ views/
│  ├─ logic/                  # 逻辑型特性（如 Vault 监听、代码块嵌入等）
│  ├─ quick-input/
│  ├─ settings/
│  │  └─ ui/components/view-editors/
│  │      ├─ registry.ts      # VIEW_DEFAULT_CONFIGS
│  │      └─ StatisticsViewEditor.tsx 等
│  └─ timer/
│     ├─ index.ts
│     ├─ FloatingTimerWidget.ts
│     └─ ui/
├─ platform/
│  ├─ index.ts
│  └─ obsidian.ts             # Obsidian 适配
└─ state/
   ├─ AppStore.ts             # 自研 Store（发布-订阅 + 持久化）
   ├─ index.ts
   └─ storeRegistry.ts        # 全局服务注册/访问
```

路径别名（tsconfig + vite）：
- @core/* → src/core/*，@platform/* → src/platform/*，@features/* → src/features/*，@state/* → src/state/*，@shared/* → src/shared/*

React 生态兼容（vite.resolve.alias）：
- react、react-dom、react/jsx-runtime → preact/compat

---

## 4. 启动流程与懒加载架构

入口：src/main.ts  
主要职责：
- 读取并合并设置（DEFAULT_SETTINGS）
- 依赖注入：容器中注册 AppToken（Obsidian App 实例）、SETTINGS_TOKEN（ThinkSettings）
- ServiceManager 分阶段加载服务与 UI
- 全局样式注入（GLOBAL_CSS）
- 注册 Obsidian 命令
- 错误处理 + Notice 反馈

ServiceManager（简化）：
- initializeCore：
  - 解析 AppStore、TimerStateService
  - AppStore 绑定插件实例（用于持久化）
- loadTimerServices：
  - 解析 TimerService
  - 初始化 FloatingTimerWidget（悬浮计时器）
  - 注册命令 toggle-think-floating-timer
  - 加载计时器持久化状态后注入 AppStore
- loadDataServices：
  - 解析 DataStore、RendererService、ActionService、InputService、TaskService
  - 注册至 storeRegistry（对外访问）
  - 开始后台数据扫描 initialScan()，完成后 notifyChange()
- loadUIFeatures：
  - 等待数据扫描完成后 setup Dashboard（避免空数据首屏）
  - QuickInput/Settings 采用 setTimeout 错峰初始化（100/150ms）

卸载（onunload）：
- 移除注入样式 STYLE_TAG_ID
- serviceManager.cleanup()（计时器/渲染清理）
- container.clearInstances()

---

## 5. 依赖注入（TSyringe）与服务编排

- 容器注册：
  - container.registerSingleton(AppStore)
  - container.register(AppToken, { useValue: app })
  - container.register(SETTINGS_TOKEN, { useValue: settings })
- 服务解析：
  - ServiceManager 中按阶段 container.resolve(XxxService)
- 全局访问：
  - state/storeRegistry.ts 暴露 registerStore/registerDataStore/registerTimerService/registerInputService

命令示例（main.ts）：
```ts
this.plugin.addCommand({
  id: 'toggle-think-floating-timer',
  name: '切换悬浮计时器显隐',
  callback: () => this.services.appStore!.toggleTimerWidgetVisibility(),
});
```

---

## 6. UI 与样式

- UI：Preact TSX 函数组件为主，按 views/ui/hooks/styles 分层
- 全局样式：features/dashboard/styles/global.ts → GLOBAL_CSS  
  main.ts 中 injectGlobalCss() 将其注入到 <style id=STYLE_TAG_ID>
- 组件状态获取：useStore(selector)（订阅 Store 子树）

---

## 7. 状态管理（AppStore）

文件：src/state/AppStore.ts

状态结构：
```ts
export interface AppState {
  settings: ThinkSettings;         // 永久配置
  timers: TimerState[];            // 计时器列表
  activeTimer?: TimerState;        // 正在运行的计时器
  isTimerWidgetVisible: boolean;   // 悬浮计时器可见性（临时态）
}
```

关键方法：
- getState / subscribe：读取/订阅状态
- _updateSettingsAndPersist：更新 settings 并 saveData
- _updateEphemeralState：更新临时 UI 状态（不持久化）
- toggleTimerWidgetVisibility：切换悬浮计时器可见
- updateFloatingTimerEnabled：同步永久设置 + 临时态
- 计时器：setInitialTimers/add/update/remove（注：持久化见“注意事项”）
- 主题矩阵：themes、overrides 批量操作
- 视图实例与布局：add/update/delete/move/duplicate/reorder（依赖 VIEW_DEFAULT_CONFIGS 保持配置一致性）

useStore Hook（节选）：
```ts
export function useStore<T>(selector: (state: AppState) => T): T {
  // memoized selector + Object.is 判断，减少无效重渲染
}
```

---

## 8. 特性模块概览

- Dashboard（@features/dashboard）
  - setup(...)：在数据扫描完成后初始化
  - ui/ 与 views/：视图与展示组件（如 StatisticsView.tsx）
  - styles/global.ts：GLOBAL_CSS

- Quick Input（@features/quick-input）
  - setup(...)：快速录入工作流

- Timer（@features/timer）
  - FloatingTimerWidget：悬浮计时器
  - TimerService / TimerStateService：计时逻辑 + 文件持久化

- Settings（@features/settings）
  - view-editors/registry.ts：VIEW_DEFAULT_CONFIGS（视图默认配置）
  - view-editors/*：各视图编辑器（如 StatisticsViewEditor.tsx）
  - setup(...)：注册设置 Tab + think-open-settings 命令

---

## 9. 构建与打包（Vite）

vite.config.ts 要点：
- 插件：@preact/preset-vite、@rollup/plugin-replace(process.env.NODE_ENV)
- alias：react → preact/compat；同步 tsconfig 路径别名（@core/@features/...）
- build：
  - outDir: dist
  - lib.entry: src/main.ts
  - formats: ['cjs']
  - fileName: main.js
  - external: ['obsidian']
  - treeshake: { moduleSideEffects: false }
  - sourcemap: true
- optimizeDeps：预构建 preact、preact/hooks
- esbuild：注入 Preact JSX 工厂

产物：
- dist/main.js（核心）
- manifest.json 位于仓库根目录（复制部署时需一并带上）
- styles.css（如你另行生成或引入样式资产）

---

## 10. 测试

脚本（package.json）：
- 单元/集成：Jest（jest + jest-environment-jsdom）
- E2E：WebdriverIO（wdio-obsidian-service、wdio-obsidian-reporter）
- 性能：test/performance 用例

建议：
- 优先为 service 层编写单元测试（纯逻辑、可 mock）
- UI 测试以浅渲染 + store mock 为主
- 集成/E2E 用于验证完整工作流（仪表板、快速输入、计时器）

---

## 11. 扩展指南

A. 新增 Dashboard 视图类型
1) 在 features/dashboard/ui/ 中创建展示组件（如 MyView.tsx）  
2) 在 settings 的 view-editors/registry.ts 添加 VIEW_DEFAULT_CONFIGS.MyView  
3) 在 settings 的 view-editors 中提供 MyViewEditor.tsx  
4) AppStore.updateViewInstance 切换 viewType 时会应用默认 viewConfig  
5) 在 Dashboard 渲染逻辑中映射新的 viewType → 组件

B. 新增服务
1) 在 @core/services 新建 XxxService.ts（必要时在 types.ts 加 token）  
2) 在 ServiceManager 合适阶段（initializeCore/loadDataServices）解析与初始化  
3) 如需对外访问，将实例注册到 state/storeRegistry

C. 新增命令（main.ts）
```ts
this.addCommand({
  id: 'think-xxx',
  name: '执行 XXX',
  callback: () => { /* 使用 AppStore/Service 实现 */ }
});
```

D. 新增设置字段
1) 在 @core/domain/schema.ts 扩展类型与 DEFAULT_SETTINGS  
2) 在 AppStore._updateSettingsAndPersist 路径下读写  
3) 建立 Settings UI 输入项

---

## 12. 性能策略

- 分阶段懒加载（核心 → 计时器 → 数据 → UI）
- 数据扫描后台 Promise；完成后 notifyChange() 再渲染 Dashboard
- UI 特性 setTimeout 错峰（100/150ms）
- Rollup treeshake + external obsidian 缩小体积
- 关键阶段使用 console.time/timeEnd 采样

---

## 13. 注意事项与已知问题

1) AppStore 与 TimerStateService 的依赖路径不一致  
   - 现状：AppStore._updateTimersAndPersist 调用 `this._plugin?.timerStateService.saveStateToFile(...)`，但 ThinkPlugin 类型并未声明该属性，且实例由 ServiceManager 持有。  
   - 影响：类型报错/运行期潜在空引用（依赖可选链规避但无法持久化）。  
   - 建议修正（任选其一）：  
     a) 将 TimerStateService 直接注入 AppStore（通过 container.resolve 或构造注入），移除对 plugin 间接依赖。  
     b) 在 ThinkPlugin 上提供 getTimerStateService() 访问器，并在初始化后由 ServiceManager 挂接。  
     c) 由 ServiceManager 向 AppStore 注入“保存函数”（依赖倒置，避免直接持有服务）。

2) styles.css  
   - manifest.json 声明了 styles.css，但仓库未必生成或提交该文件。当前样式主要通过 GLOBAL_CSS 动态注入。  
   - 如需独立 CSS，请在构建配置中输出样式资产并提供对应文件（或将 styles 从 manifest 中移除/改为实际文件名）。

3) DEVELOPMENT.md 目录示例与实际存在偏差（platform 子目录等），以本文件与实际源码优先。

---

## 14. 代码规范（约定）

- TypeScript 严格模式（strict: true）
- 函数组件优先，逻辑/展示分层
- 命名：
  - 类/类型：PascalCase
  - 函数/变量：camelCase
  - 常量：UPPER_SNAKE_CASE
  - 组件文件：FeatureName.tsx；工具文件：verbNoun.ts
- 路径别名：@core/@features/@state 等，避免相对路径地狱
- 日志：关键阶段使用 console.time/timeEnd；避免高频 Notice

---

## 15. 参考资料

- 项目内部文档：README.md、ARCHITECTURE.md
- Obsidian API：https://docs.obsidian.md/
- Preact：https://preactjs.com/
- TSyringe：https://github.com/microsoft/tsyringe
- Vite：https://vitejs.dev/

---

## 16. 下一步建议

- 将 AppStore ↔ TimerStateService 依赖修正为可测试/可替换的注入路径（见 13.1）
- 若需要独立样式文件，完善 CSS 生成与 manifest 对齐
- 在 README 与 DEVELOPMENT.md 顶部增加指向本开发文档的链接
