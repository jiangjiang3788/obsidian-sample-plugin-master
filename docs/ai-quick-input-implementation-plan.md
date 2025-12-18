# AI 自然语言快捷输入实现计划 (完善版)

## 一、目标与原则

**目标**：
在现有 Think 插件（Block + Theme + 字段配置 + 快速输入）的基础上，实现统一的「AI 自然语言 → 自动选择合适 Block/Theme → 自动填字段 → 显示确认 UI → 保存」能力，并提供 AI 设置页面控制行为与性能。

**设计原则**：
1.  **非侵入式扩展**：只在现有 Block + 字段 + Theme 体系上扩展，不修改核心数据结构。
2.  **AI 辅助决策**：由 AI 自动判断 blockId/themeId 和字段值，但最终决定权在用户。
3.  **用户确认机制**：所有写入前**必须经过用户确认 UI**，确保数据准确性。
4.  **配置化控制**：提供独立 AI 设置页，控制模型、block 参与范围、多结果行为和性能策略。
5.  **架构一致性**：遵循现有的 Core/Features/App 分层架构和 DI 依赖注入模式。

---

## 二、架构设计

### 2.1 模块划分

1.  **Core Layer (核心层)**
    *   `types/ai.ts`: 定义 AI 设置、命令、批处理等核心类型。
    *   `ai/AiConfigSnapshot.ts`: 构建 AI 友好的配置快照（Block/Theme 简化信息）。
    *   `ai/AiHttpClient.ts`: 封装与 LLM (OpenAI/DeepSeek/Ollama) 的通信。
    *   `ai/AiNaturalLanguageParser.ts`: 核心解析逻辑，将自然语言转换为结构化命令。
    *   `ai/BlockRuntimeBuilder.ts`: 将解析结果转换为可执行的 Block 运行时配置。

2.  **Features Layer (功能层)**
    *   `settings/AiStore.ts`: 管理 AI 设置状态，遵循子 Store 模式。
    *   `settings/AiSettings.tsx`: AI 设置页面 UI。
    *   `ai/ui/AiConfirmModal.tsx`: 单条记录确认/编辑 Modal。
    *   `ai/ui/AiBatchConfirmModal.tsx`: 多条记录批量确认/编辑 Modal。
    *   `ai/registerCommands.ts`: 注册 AI 快捷输入命令。

3.  **App Layer (应用层)**
    *   `AppStore`: 集成 `AiStore`。
    *   `ServiceManager`: 管理 AI 服务的生命周期。

### 2.2 数据流

1.  **配置阶段**：用户在 `AiSettings` 修改配置 → `AiStore` 更新 `ThinkSettings` → `AiConfigSnapshot` 缓存失效。
2.  **执行阶段**：
    *   用户触发命令 → 输入自然语言。
    *   `AiNaturalLanguageParser` 获取 `AiConfigSnapshot`。
    *   `AiNaturalLanguageParser` 调用 `AiHttpClient` (LLM)。
    *   LLM 返回 JSON → 解析为 `NaturalRecordBatch`。
    *   `BlockRuntimeBuilder` 为每条记录构建 `BlockRuntimeConfig`。
    *   弹出 `AiConfirmModal` (单条) 或 `AiBatchConfirmModal` (多条)。
    *   用户确认/修改 → 调用 `InputService.executeTemplate` 保存。

---

## 三、核心类型定义

### 3.1 AI 设置 (`src/core/types/ai.ts`)

```typescript
export interface AiSettings {
    enabled: boolean;
    provider: 'openai' | 'deepseek' | 'ollama' | 'custom';
    apiEndpoint?: string;
    apiKey?: string;
    model: string;
    temperature: number;
    maxTokens: number;
    
    // Block 识别策略
    blockMappingMode: 'auto' | 'guided';
    defaultThemeId?: string;
    blockPriorities: { blockId: string; weight: number; enabled: boolean }[];
    
    // 多结果行为
    allowMultipleResults: boolean;
    maxResults: number;
    multiResultDisplayMode: 'list' | 'grouped-by-block';
    autoMergeSmallResults: boolean;
    
    // 性能与缓存
    preloadConfigOnStartup: boolean;
    configCacheTTLSeconds: number;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
    enabled: false,
    provider: 'openai',
    apiEndpoint: '',
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 1024,
    blockMappingMode: 'auto',
    defaultThemeId: undefined,
    blockPriorities: [],
    allowMultipleResults: true,
    maxResults: 3,
    multiResultDisplayMode: 'list',
    autoMergeSmallResults: false,
    preloadConfigOnStartup: false,
    configCacheTTLSeconds: 300,
};
```

### 3.2 解析结果 (`src/core/types/ai.ts`)

```typescript
export interface NaturalRecordCommand {
    rawText: string;
    target: {
        blockId: string;
        themeId?: string;
    };
    fieldValues: Record<string, string>;
    meta?: {
        confidence?: number;
        reason?: string;
    };
}

export interface NaturalRecordBatch {
    items: NaturalRecordCommand[];
}
```

---

## 四、详细实现步骤

### 阶段一：基础架构 (P0)

1.  **定义类型**：
    *   创建 `src/core/types/ai.ts`。
    *   修改 `src/core/types/schema.ts`，引入 `AiSettings` 并添加到 `ThinkSettings`。

2.  **扩展 AppStore**：
    *   创建 `src/features/settings/AiStore.ts`。
    *   在 `src/app/AppStore.ts` 中初始化 `AiStore`。

3.  **注册服务**：
    *   在 `src/core/di/setupCore.ts` 中注册 AI 相关 Token (如果需要)。
    *   在 `src/app/ServiceManager.ts` 中预留 AI 服务加载逻辑。

### 阶段二：核心服务 (P0)

1.  **配置快照 (`AiConfigSnapshot`)**：
    *   创建 `src/core/ai/AiConfigSnapshot.ts`。
    *   实现 `AiConfigSnapshotBuilder`，从 `ThinkSettings` 提取精简的 Block/Theme 信息，用于构建 Prompt。

2.  **HTTP 客户端 (`AiHttpClient`)**：
    *   创建 `src/core/ai/AiHttpClient.ts`。
    *   实现与 OpenAI 兼容接口的通信，处理 API Key、Endpoint 和错误重试。

3.  **自然语言解析器 (`AiNaturalLanguageParser`)**：
    *   创建 `src/core/ai/AiNaturalLanguageParser.ts`。
    *   设计 System Prompt，包含 Block 定义、字段约束和输出 JSON 格式要求。
    *   实现 `parse(text, context)` 方法。

4.  **运行时构建器 (`BlockRuntimeBuilder`)**：
    *   创建 `src/core/ai/BlockRuntimeBuilder.ts`。
    *   实现逻辑：根据 `blockId` + `themeId`，结合 `overrides`，计算出最终的 `fields`、`outputTemplate` 和 `targetFile`。

### 阶段三：UI 实现 (P1)

1.  **AI 设置页**：
    *   创建 `src/features/settings/AiSettings.tsx`。
    *   集成到 `src/features/settings/SettingsTab.tsx`。
    *   实现模型配置、Block 启用/禁用/权重配置。

2.  **确认 Modal**：
    *   创建 `src/features/ai/ui/AiConfirmModal.tsx` (单条)。
    *   创建 `src/features/ai/ui/AiBatchConfirmModal.tsx` (多条)。
    *   复用 `QuickInputModal` 中的表单渲染逻辑 (可能需要提取公共组件 `QuickInputForm`)。

### 阶段四：集成与命令 (P1)

1.  **注册命令**：
    *   创建 `src/features/ai/registerCommands.ts`。
    *   注册 `AI: 自然语言快速记录` 命令。

2.  **流程串联**：
    *   在命令回调中：
        1.  获取用户输入 (InputBox)。
        2.  调用 `AiNaturalLanguageParser.parse`。
        3.  调用 `BlockRuntimeBuilder`。
        4.  打开 `AiConfirmModal` / `AiBatchConfirmModal`。
        5.  用户确认后，调用 `InputService.executeTemplate`。

---

## 五、文件结构变更概览

```text
src/
├── core/
│   ├── types/
│   │   ├── ai.ts                  [NEW] AI 类型定义
│   │   └── schema.ts              [MOD] 添加 AiSettings
│   └── ai/                        [NEW] AI 核心逻辑
│       ├── index.ts
│       ├── AiConfigSnapshot.ts    [NEW] 配置快照
│       ├── AiHttpClient.ts        [NEW] LLM 客户端
│       ├── AiNaturalLanguageParser.ts [NEW] 解析器
│       └── BlockRuntimeBuilder.ts [NEW] 运行时构建器
├── features/
│   ├── settings/
│   │   ├── AiStore.ts             [NEW] AI 设置 Store
│   │   └── AiSettings.tsx         [NEW] AI 设置 UI
│   └── ai/                        [NEW] AI 功能模块
│       ├── registerCommands.ts    [NEW] 命令注册
│       └── ui/
│           ├── AiConfirmModal.tsx [NEW] 单条确认
│           └── AiBatchConfirmModal.tsx [NEW] 批量确认
└── app/
    ├── AppStore.ts                [MOD] 集成 AiStore
    └── ServiceManager.ts          [MOD] 加载 AI 服务
```

## 六、测试计划

1.  **单元测试**：
    *   `AiConfigSnapshot`: 验证是否正确过滤和格式化 Block/Theme 信息。
    *   `BlockRuntimeBuilder`: 验证 Override 逻辑是否正确生效。
    *   `AiNaturalLanguageParser`: Mock HTTP 请求，验证 JSON 解析和错误处理。

2.  **集成测试**：
    *   **单条记录流程**：输入文本 → 解析 → 确认 UI 弹出 → 字段预填正确 → 保存成功。
    *   **多条记录流程**：输入复杂文本 → 解析出多条 → 批量确认 UI → 选择性保存。
    *   **设置生效**：修改模型/Prompt 设置 → 解析行为改变。

---

## 七、后续优化 (P2)

1.  **Prompt 优化**：支持用户自定义 System Prompt。
2.  **上下文感知**：将当前活动文件内容、选中文本作为上下文传递给 AI。
3.  **本地模型支持**：优化对 Ollama 等本地模型的支持（流式输出、超时处理）。
4.  **学习机制**：记录用户的修正操作，优化后续的 Block 推荐权重。
