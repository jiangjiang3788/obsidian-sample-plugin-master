# ThemeMatrix 批量操作增强计划

> 项目名称：ThemeMatrix 批量操作功能增强  
> 创建日期：2025年10月12日  
> 预计工期：2天  
> 优先级：高  
> 影响范围：主题矩阵管理模块

## 一、需求背景

### 1.1 当前限制
- 批量操作仅支持主题级别的激活/归档/删除
- 无法批量设置主题图标
- 无法批量配置Block覆盖状态（继承/覆盖/禁用）
- 选择模式单一，只能选择整个主题行

### 1.2 用户需求
- 支持批量设置主题图标
- 支持批量设置Block状态（继承/覆盖/禁用）
- 支持多种选择模式（主题/Block列/单元格）
- 支持批量应用配置模板

## 二、功能设计

### 2.1 批量操作类型扩展

#### 主题级操作
| 操作类型 | 功能描述 | 当前状态 |
|---------|---------|----------|
| activate | 批量激活主题 | ✅ 已实现 |
| archive | 批量归档主题 | ✅ 已实现 |
| delete | 批量删除主题 | ✅ 已实现 |
| setIcon | 批量设置图标 | 🆕 新增 |
| editMode | 批量进入编辑模式 | 🆕 新增 |

#### Block级操作
| 操作类型 | 功能描述 | 当前状态 |
|---------|---------|----------|
| setBlockInherit | 设置为继承状态 | 🆕 新增 |
| setBlockOverride | 设置为覆盖状态 | 🆕 新增 |
| setBlockDisabled | 设置为禁用状态 | 🆕 新增 |
| clearBlockOverrides | 清除所有覆盖 | 🆕 新增 |
| applyTemplate | 应用配置模板 | 🆕 新增 |

### 2.2 选择模式设计

```typescript
type SelectionMode = 'theme' | 'block' | 'cell';

interface SelectionState {
  mode: SelectionMode;
  selectedThemes: Set<string>;      // 选中的主题ID
  selectedBlocks: Set<string>;      // 选中的Block ID
  selectedCells: Set<string>;       // 选中的单元格 "themeId:blockId"
}
```

#### 选择模式说明
1. **主题模式（theme）**
   - 选择整个主题行
   - 支持批量激活/归档/删除/设置图标

2. **Block模式（block）**
   - 选择整个Block列
   - 支持批量设置该列所有主题的Block状态

3. **单元格模式（cell）**
   - 选择特定的主题-Block组合
   - 支持精确控制特定配置

### 2.3 交互设计

#### 选择交互
- **单击**：选择/取消选择单个项目
- **Shift+单击**：范围选择
- **Ctrl+单击**：多选/取消多选
- **列头复选框**：全选/取消全选该列

#### 批量操作流程
1. 切换到相应的选择模式
2. 选择目标项目
3. 点击批量操作按钮或右键菜单
4. 在对话框中选择操作类型和参数
5. 预览影响范围
6. 确认执行

## 三、技术实现

### 3.1 文件结构

```
src/features/settings/ui/ThemeMatrix/
├── types/
│   ├── batch.types.ts          # 批量操作类型定义
│   └── selection.types.ts      # 选择状态类型定义
├── hooks/
│   ├── useBatchOperations.ts   # 批量操作逻辑
│   └── useSelectionMode.ts     # 选择模式管理
├── components/
│   ├── BatchOperationDialog/
│   │   ├── index.tsx           # 增强的批量操作对话框
│   │   ├── ThemeOperations.tsx # 主题级操作面板
│   │   ├── BlockOperations.tsx # Block级操作面板
│   │   └── IconSelector.tsx    # 图标选择器
│   ├── SelectionModeToggle.tsx # 选择模式切换器
│   └── BlockColumnHeader.tsx   # Block列头组件
├── services/
│   └── BatchOperationService.ts # 批量操作服务
└── utils/
    └── batchOperations.ts      # 批量操作工具函数
```

### 3.2 核心类型定义

```typescript
// batch.types.ts
export type BatchOperationType = 
  // 主题级操作
  | 'activate'           
  | 'archive'           
  | 'delete'            
  | 'setIcon'
  | 'editMode'
  // Block级操作
  | 'setBlockInherit'
  | 'setBlockOverride'
  | 'setBlockDisabled'
  | 'clearBlockOverrides'
  | 'applyTemplate';

export interface BatchOperationParams {
  operation: BatchOperationType;
  targets: {
    themeIds?: string[];
    blockIds?: string[];
    cells?: Array<{themeId: string; blockId: string}>;
  };
  params?: {
    icon?: string;
    template?: Partial<ThemeOverride>;
    status?: 'enabled' | 'disabled';
  };
}

export interface BatchOperationResult {
  success: number;
  failed: number;
  errors: string[];
}
```

### 3.3 服务层实现

```typescript
// BatchOperationService.ts
export class BatchOperationService {
  constructor(
    private appStore: AppStore,
    private themeManager: ThemeManager
  ) {}

  async executeBatchOperation(
    params: BatchOperationParams
  ): Promise<BatchOperationResult> {
    switch (params.operation) {
      case 'setIcon':
        return this.batchSetIcon(params);
      case 'setBlockInherit':
      case 'setBlockOverride':
      case 'setBlockDisabled':
        return this.batchSetBlockStatus(params);
      case 'applyTemplate':
        return this.batchApplyTemplate(params);
      // ... 其他操作
    }
  }

  private async batchSetIcon(
    params: BatchOperationParams
  ): Promise<BatchOperationResult> {
    const { themeIds } = params.targets;
    const { icon } = params.params || {};
    
    if (!themeIds || !icon) {
      throw new Error('Missing required parameters');
    }

    const result: BatchOperationResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const themeId of themeIds) {
      try {
        await this.appStore.updateTheme(themeId, { icon });
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to update theme ${themeId}: ${error}`);
      }
    }

    return result;
  }

  private async batchSetBlockStatus(
    params: BatchOperationParams
  ): Promise<BatchOperationResult> {
    const { operation, targets, params: opParams } = params;
    const status = this.getStatusFromOperation(operation);
    
    const overrides: Array<Omit<ThemeOverride, 'id'>> = [];
    
    // 构建覆盖配置列表
    if (targets.cells) {
      targets.cells.forEach(cell => {
        overrides.push({
          themeId: cell.themeId,
          blockId: cell.blockId,
          status: status === 'inherit' ? 'enabled' : status,
          // 如果是继承，实际上应该删除覆盖
        });
      });
    }

    // 批量更新
    if (status === 'inherit') {
      // 删除覆盖以实现继承
      const deletions = targets.cells?.map(c => ({
        blockId: c.blockId,
        themeId: c.themeId
      })) || [];
      await this.appStore.batchDeleteOverrides(deletions);
    } else {
      await this.appStore.batchUpsertOverrides(overrides);
    }

    return {
      success: overrides.length,
      failed: 0,
      errors: []
    };
  }

  private getStatusFromOperation(
    operation: BatchOperationType
  ): 'inherit' | 'enabled' | 'disabled' {
    switch (operation) {
      case 'setBlockInherit': return 'inherit';
      case 'setBlockOverride': return 'enabled';
      case 'setBlockDisabled': return 'disabled';
      default: return 'enabled';
    }
  }
}
```

### 3.4 AppStore 扩展

```typescript
// 在 AppStore.ts 中添加
export class AppStore {
  // ... 现有代码

  // 批量更新主题
  public batchUpdateThemes = async (
    themeIds: string[], 
    updates: Partial<ThemeDefinition>
  ) => {
    await this._updateSettingsAndPersist(draft => {
      themeIds.forEach(id => {
        const index = draft.inputSettings.themes.findIndex(t => t.id === id);
        if (index > -1) {
          Object.assign(draft.inputSettings.themes[index], updates);
        }
      });
    });
  }

  // 批量更新覆盖配置
  public batchUpsertOverrides = async (
    overrides: Array<Omit<ThemeOverride, 'id'>>
  ) => {
    await this._updateSettingsAndPersist(draft => {
      overrides.forEach(override => {
        const existingIndex = draft.inputSettings.overrides.findIndex(
          o => o.blockId === override.blockId && o.themeId === override.themeId
        );
        
        if (existingIndex > -1) {
          // 更新现有覆盖
          const existingId = draft.inputSettings.overrides[existingIndex].id;
          draft.inputSettings.overrides[existingIndex] = {
            ...override,
            id: existingId
          };
        } else {
          // 添加新覆盖
          draft.inputSettings.overrides.push({
            ...override,
            id: generateId('ovr')
          });
        }
      });
    });
  }

  // 批量删除覆盖配置
  public batchDeleteOverrides = async (
    selections: Array<{blockId: string; themeId: string}>
  ) => {
    await this._updateSettingsAndPersist(draft => {
      selections.forEach(({ blockId, themeId }) => {
        draft.inputSettings.overrides = draft.inputSettings.overrides.filter(
          o => !(o.blockId === blockId && o.themeId === themeId)
        );
      });
    });
  }
}
```

## 四、UI组件设计

### 4.1 增强的批量操作对话框

```typescript
// BatchOperationDialog/index.tsx
interface EnhancedBatchOperationDialogProps {
  open: boolean;
  onClose: () => void;
  selectionState: SelectionState;
  onConfirm: (params: BatchOperationParams) => void;
}

export function EnhancedBatchOperationDialog({
  open,
  onClose,
  selectionState,
  onConfirm
}: EnhancedBatchOperationDialogProps) {
  const [activeTab, setActiveTab] = useState<'theme' | 'block'>('theme');
  const [selectedOperation, setSelectedOperation] = useState<BatchOperationType>('activate');
  const [operationParams, setOperationParams] = useState<any>({});

  // 根据选择模式显示不同的操作选项
  const availableOperations = getAvailableOperations(selectionState.mode);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>批量操作</DialogTitle>
      <DialogContent>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="主题操作" value="theme" />
          <Tab label="Block操作" value="block" />
        </Tabs>
        
        {activeTab === 'theme' && (
          <ThemeOperations
            selectionState={selectionState}
            onOperationChange={setSelectedOperation}
            onParamsChange={setOperationParams}
          />
        )}
        
        {activeTab === 'block' && (
          <BlockOperations
            selectionState={selectionState}
            onOperationChange={setSelectedOperation}
            onParamsChange={setOperationParams}
          />
        )}
        
        <OperationPreview
          operation={selectedOperation}
          selectionState={selectionState}
          params={operationParams}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button 
          onClick={() => onConfirm({
            operation: selectedOperation,
            targets: getTargetsFromSelection(selectionState),
            params: operationParams
          })}
          variant="contained"
        >
          确认执行
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

### 4.2 选择模式切换器

```typescript
// SelectionModeToggle.tsx
export function SelectionModeToggle({
  mode,
  onChange,
  selectionCount
}: {
  mode: SelectionMode;
  onChange: (mode: SelectionMode) => void;
  selectionCount: { themes: number; blocks: number; cells: number };
}) {
  return (
    <ToggleButtonGroup
      value={mode}
      exclusive
      onChange={(_, value) => value && onChange(value)}
      size="small"
    >
      <ToggleButton value="theme">
        <Tooltip title={`主题模式 (${selectionCount.themes} 已选)`}>
          <TableRowsIcon />
        </Tooltip>
      </ToggleButton>
      <ToggleButton value="block">
        <Tooltip title={`Block模式 (${selectionCount.blocks} 已选)`}>
          <ViewColumnIcon />
        </Tooltip>
      </ToggleButton>
      <ToggleButton value="cell">
        <Tooltip title={`单元格模式 (${selectionCount.cells} 已选)`}>
          <GridOnIcon />
        </Tooltip>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
```

## 五、实施计划

### Phase 1: 基础架构（4小时）
- [x] 创建类型定义文件
- [ ] 实现BatchOperationService
- [ ] 扩展AppStore方法
- [ ] 创建选择状态管理Hook

### Phase 2: UI组件（4小时）
- [ ] 增强批量操作对话框
- [ ] 实现选择模式切换器
- [ ] 添加Block列头组件
- [ ] 更新表格交互逻辑

### Phase 3: 集成测试（2小时）
- [ ] 主题批量操作测试
- [ ] Block批量操作测试
- [ ] 选择模式切换测试
- [ ] 端到端流程测试

## 六、测试计划

### 6.1 单元测试
- BatchOperationService 各方法测试
- 选择状态管理逻辑测试
- 批量操作工具函数测试

### 6.2 集成测试
- 批量设置图标流程
- 批量设置Block状态流程
- 选择模式切换流程
- 批量操作撤销流程

### 6.3 用户验收测试
- 批量操作10个主题的性能
- 批量操作50个单元格的性能
- UI响应性和视觉反馈

## 七、风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|-----|------|------|----------|
| 批量操作性能问题 | 中 | 高 | 分批处理，显示进度 |
| 状态同步问题 | 低 | 高 | 使用事务确保原子性 |
| UI复杂度增加 | 高 | 中 | 渐进式展示高级功能 |
| 兼容性问题 | 低 | 中 | 充分测试各种场景 |

## 八、成功指标

- [ ] 支持5种以上新的批量操作类型
- [ ] 支持3种选择模式
- [ ] 批量操作响应时间 < 1秒（100个项目）
- [ ] 用户满意度提升30%
- [ ] 代码测试覆盖率 > 80%

---

**文档信息**
- 创建人：Assistant
- 创建时间：2025年10月12日
- 版本：v1.0
- 状态：实施中
