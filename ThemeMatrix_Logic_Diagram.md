# ThemeMatrix 组件逻辑架构图

## 1. 整体架构图

```mermaid
graph TB
    subgraph "用户界面层"
        A[ThemeMatrix 主组件] --> B[ThemeToolbar 工具栏]
        A --> C[ThemeTable 主题表格]
        A --> D[EnhancedBatchOperationDialog 批量操作对话框]
        A --> E[TemplateEditorModal 模板编辑器]
        
        C --> F[ThemeTreeNodeRow 主题行]
        C --> G[InlineEditor 内联编辑器]
    end
    
    subgraph "状态管理层"
        H[useThemeMatrixSelection Hook] --> I[选择状态管理]
        J[useBatchOperations Hook] --> K[批量操作管理]
        L[useState Hooks] --> M[本地状态]
    end
    
    subgraph "服务层"
        N[ThemeMatrixService] --> O[主题业务逻辑]
        P[BatchOperationService] --> Q[批量操作逻辑]
        R[ThemeManager] --> S[主题管理器]
    end
    
    subgraph "数据层"
        T[AppStore] --> U[全局状态]
        T --> V[数据持久化]
        W[buildThemeTree] --> X[主题树构建]
    end
    
    A --> H
    A --> J
    A --> N
    N --> R
    N --> T
    P --> T
    H --> T
    J --> T
```

## 2. 数据流图

```mermaid
flowchart LR
    subgraph "数据源"
        A[AppStore.settings.inputSettings]
        A1[blocks: BlockTemplate[]]
        A2[themes: ThemeDefinition[]]
        A3[overrides: ThemeOverride[]]
        A --> A1
        A --> A2
        A --> A3
    end
    
    subgraph "数据处理"
        B[ThemeMatrixService.getExtendedThemes]
        C[buildThemeTree]
        D[groupThemesByStatus]
        
        A2 --> B
        B --> C
        C --> D
    end
    
    subgraph "UI渲染"
        E[extendedThemes]
        F[themeTree]
        G[activeThemes / archivedThemes]
        H[overridesMap]
        
        B --> E
        C --> F
        D --> G
        A3 --> H
    end
    
    subgraph "用户交互"
        I[选择操作]
        J[批量操作]
        K[单元格编辑]
        L[主题管理]
    end
    
    E --> I
    F --> J
    G --> K
    H --> L
```

## 3. 组件交互图

```mermaid
sequenceDiagram
    participant User as 用户
    participant TM as ThemeMatrix
    participant TT as ThemeToolbar
    participant Table as ThemeTable
    participant Hook as useThemeMatrixSelection
    participant Service as ThemeMatrixService
    participant Store as AppStore
    
    User->>TM: 切换选择模式
    TM->>Hook: setMode('theme'/'block')
    Hook->>TT: 更新工具栏状态
    
    User->>Table: 选择主题/Block
    Table->>Hook: toggleThemeSelection/toggleBlockSelection
    Hook->>TM: 更新选择状态
    TM->>TT: 更新选择统计
    
    User->>TT: 点击批量操作
    TT->>TM: 打开批量操作对话框
    User->>TM: 确认批量操作
    TM->>Service: executeBatchOperation
    Service->>Store: 更新数据
    Store->>TM: 通知状态变更
    TM->>Table: 重新渲染
```

## 4. 状态管理图

```mermaid
stateDiagram-v2
    [*] --> 初始化
    初始化 --> 主题模式
    初始化 --> Block模式
    
    state 主题模式 {
        [*] --> 未选择
        未选择 --> 单选: 点击复选框
        单选 --> 多选: Ctrl+点击
        多选 --> 单选: 取消选择
        单选 --> 未选择: 清空选择
        多选 --> 未选择: 清空选择
        
        单选 --> 批量操作
        多选 --> 批量操作
        批量操作 --> 未选择: 操作完成
    }
    
    state Block模式 {
        [*] --> 未选择Block
        未选择Block --> 选择列: 点击列头
        选择列 --> 多列选择: 继续选择
        选择列 --> 未选择Block: 清空选择
        多列选择 --> 未选择Block: 清空选择
        
        选择列 --> Block批量操作
        多列选择 --> Block批量操作
        Block批量操作 --> 未选择Block: 操作完成
    }
    
    主题模式 --> Block模式: 切换模式
    Block模式 --> 主题模式: 切换模式
```

## 5. 核心功能模块图

```mermaid
mindmap
  root((ThemeMatrix))
    主题管理
      添加主题
      删除主题
      编辑主题
      激活/归档
      树状结构
    Block配置
      覆盖设置
      继承状态
      禁用状态
      模板编辑
    选择功能
      主题选择
        单选
        多选
        范围选择
      Block选择
        列选择
        单元格选择
    批量操作
      主题批量
        批量激活
        批量归档
        批量删除
        批量设置图标
      Block批量
        批量继承
        批量覆盖
        批量禁用
        批量应用模板
    数据持久化
      自动保存
      状态同步
      错误处理
```

## 6. 问题分析图

```mermaid
graph TD
    A[当前问题] --> B[功能重复]
    A --> C[选择逻辑复杂]
    A --> D[批量操作受限]
    A --> E[代码冗余]
    
    B --> B1[选择列与状态列重复]
    C --> C1[三种选择模式过于复杂]
    C --> C2[theme/block/cell模式混乱]
    D --> D1[只能批量激活主题]
    D --> D2[不能批量设置其他属性]
    E --> E1[多个组件功能重叠]
    E --> E2[Hook功能冗余]
    
    style A fill:#ff9999
    style B fill:#ffcc99
    style C fill:#ffcc99
    style D fill:#ffcc99
    style E fill:#ffcc99
```

## 7. 重构方案图

```mermaid
graph LR
    subgraph "当前架构"
        A1[三种选择模式]
        A2[选择列 + 状态列]
        A3[复杂的选择逻辑]
        A4[有限的批量操作]
    end
    
    subgraph "目标架构"
        B1[双模式设计]
        B2[状态列作为选择]
        B3[简化的选择逻辑]
        B4[增强的批量操作]
    end
    
    A1 --> B1
    A2 --> B2
    A3 --> B3
    A4 --> B4
    
    B1 --> C1[主题模式 + Block模式]
    B2 --> C2[移除选择列]
    B3 --> C3[useThemeMatrixSelection Hook]
    B4 --> C4[支持图标、状态、Block配置]
```

## 8. 关键代码逻辑

### 8.1 选择状态管理
```typescript
// 当前实现
const {
    selection,           // 选择状态
    selectionStats,      // 选择统计
    mode,               // 选择模式 (theme/block/cell)
    toggleThemeSelection,
    toggleBlockSelection,
    selectAll,
    clearSelection
} = useThemeMatrixSelection(themeTree);
```

### 8.2 批量操作流程
```typescript
// 操作流程
User Action → Selection Hook → Batch Dialog → Service Layer → AppStore → Persistence
```

### 8.3 数据持久化
```typescript
// 持久化机制
AppStore._updateSettingsAndPersist = async (updater) => {
    // 1. 更新内存状态
    // 2. 保存到磁盘
    // 3. 通知订阅者
}
```

## 9. 性能优化点

```mermaid
graph TD
    A[性能优化] --> B[虚拟滚动]
    A --> C[懒加载]
    A --> D[批量更新]
    A --> E[缓存优化]
    
    B --> B1[支持大量主题]
    C --> C1[Block配置按需加载]
    D --> D1[减少重渲染次数]
    E --> E1[useMemo缓存计算结果]
```

## 10. 修改建议

基于分析，建议的修改方向：

1. **简化选择模式**：从三种模式简化为两种（主题模式 + Block模式）
2. **移除选择列**：使用状态列的复选框作为主题选择
3. **增强批量操作**：支持图标、状态、Block配置的批量设置
4. **代码重构**：清理冗余组件和Hook
5. **性能优化**：添加虚拟滚动和缓存机制

你想要修改哪个具体的方面？我可以帮你实现相应的改进。
