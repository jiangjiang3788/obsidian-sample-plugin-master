# 2025-11-23 架构重构执行计划

基于 `docs/2025-11-22 修改计划.md` 的建议，本计划旨在将插件从“强架构”转变为“好读架构”，降低认知成本，使启动流程线性化。

**核心原则**：稳步进行，单线程操作，一次只修改一个方向。

---

## 阶段一：入口 & 启动流程重构 (当前优先级)

**目标**：让 `main.ts` 成为清晰的“目录页”，让 `ServiceManager` 成为有序的“剧本”。

### 1.1 提取依赖注入配置
*   **任务**：创建 `src/core/di/setupCore.ts`。
*   **内容**：将 `main.ts` 中分散的 `container.register` 逻辑（AppToken, SETTINGS_TOKEN, STORAGE_TOKEN, AppStore 等）提取到 `setupCoreContainer` 函数中。
*   **目的**：净化入口文件，隐藏配置细节。

### 1.2 重构插件入口 (`main.ts`)
*   **任务**：重写 `ThinkPlugin.onload` 方法。
*   **新流程**：
    1.  `loadSettings()`
    2.  `setupCoreContainer()`
    3.  `new ServiceManager()`
    4.  `serviceManager.bootstrap()`
    5.  `registerCommands()`
*   **目的**：实现 4-6 步的线性启动逻辑。

### 1.3 重构服务管理器 (`ServiceManager.ts`)
*   **任务**：
    *   新增 `bootstrap()` 方法，按逻辑顺序编排启动流程。
    *   重组内部方法调用顺序：`initializeCore` -> `loadTimerServices` -> `loadUIFeatures` -> `loadDataServices` -> `scanDataInBackground`。
    *   使用注释块（如 `// ========== UI 功能加载 ==========`）对方法进行视觉分组。
*   **目的**：提供清晰的启动剧本。

---

## 阶段二：角色明确与代码注释 (后续)

**目标**：通过文件头注释和职责约定，让每个文件的作用一目了然。

### 2.1 添加角色说明书
*   **任务**：为核心 Store、Service、Feature 文件添加统一格式的文件头注释。
*   **格式示例**：
    ```typescript
    /**
     * TimerService - 计时器业务逻辑
     * 角色：Service（业务）
     * 职责：开始/停止计时、状态写入 Store
     * 不做：直接渲染 UI、操作 DOM
     */
    ```

### 2.2 标记主流程
*   **任务**：在关键函数（如 `onload`, `bootstrap`, `initialScan`）上添加 `[主流程]` 标记注释。
*   **目的**：支持通过全局搜索快速定位核心链路。

---

## 阶段三：服务访问规范化 (后续)

**目标**：减少“我该从哪拿服务”的困惑，统一访问模式。

### 3.1 规范注入方式
*   **任务**：
    *   **Core/Service 层**：继续使用 DI (`@inject`).
    *   **Feature/UI 层**：优先使用构造函数参数传递，减少直接 `container.resolve` 调用。
*   **目的**：明确依赖关系，降低耦合。

### 3.2 弱化全局 Registry
*   **任务**：逐步减少 `storeRegistry` 的使用，仅保留在最上层入口或调试场景。

---

## 阶段四：架构文档 (后续)

**目标**：固化设计，提供新人的“地图”。

### 4.1 创建架构文档
*   **任务**：创建 `docs/ARCHITECTURE.md`。
*   **内容**：分层图、主执行流程、关键模块对照表。

---

## 执行记录

- [ ] **阶段一：入口 & 启动流程重构**
    - [ ] 1.1 创建 `src/core/di/setupCore.ts`
    - [ ] 1.2 重构 `src/main.ts`
    - [ ] 1.3 重构 `src/app/ServiceManager.ts`
- [ ] **阶段二** (待定)
- [ ] **阶段三** (待定)
- [ ] **阶段四** (待定)
