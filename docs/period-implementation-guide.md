# "周期/period"概念在插件中的实现说明

## 概念澄清

### 核心概念区分
1. **视图时间窗**：用户在界面上选择的时间范围（年/季/月/周/天），用于确定当前查看的时间窗口
2. **字段粒度（period）**：条目自身的归属粒度标签，表示该条目属于哪个时间粒度（年/季/月/周/天）
3. **按字段粒度过滤开关**：控制是否将条目的字段粒度作为过滤条件的开关

### 设计目标
- 避免将"视图时间窗"误当成"字段粒度"来筛选
- 让用户能够明确控制是否按字段粒度过滤
- 保持数据源显式配置优先级最高

## 实现架构

### 1. 字段定义与类型（src/core/domain/）

#### fields.ts - 字段标签定义
```typescript
period: { 
    key: 'period', 
    label: '字段粒度', 
    type: 'string', 
    description: '该条目归属的时间粒度：年/季/月/周/天（未设置默认天）' 
},
periodCount: { 
    key: 'periodCount', 
    label: '粒度序号', 
    type: 'number', 
    description: '与日期结合计算出的序号，如第几周/第几月' 
}
```

#### schema.ts - 数据结构定义
```typescript
interface Layout {
    useFieldGranularity?: boolean; // 按字段粒度过滤开关
    // ... 其他字段
}

interface Item {
    period?: string;      // 字段粒度
    periodCount?: number; // 粒度序号
    // ... 其他字段
}
```

### 2. 数据解析与处理（src/core/utils/）

#### parser.ts - 元数据解析
- 支持解析 `周期/period` 元数据字段
- 当条目同时有 period 和 date 时，自动计算 periodCount

#### itemFilter.ts - 过滤工具
- `filterByPeriod(items, period)`: 按字段粒度过滤，采用宽松策略（未设置period的条目也保留）
- `filterByDateRange(items, start, end)`: 按日期范围过滤
- `filterByRules(items, rules)`: 应用数据源规则

### 3. 设置页面（src/features/settings/ui/LayoutSettings.tsx）

#### 配置项
- **"启用概览模式"** 复选框：控制 `layout.isOverviewMode`
- **"按字段粒度过滤"** 复选框：控制 `layout.useFieldGranularity`
- **"初始视图（时间窗）"** 单选组：控制 `layout.initialView`

#### 用户体验
- 文案统一：使用"初始视图（时间窗）"而非"初始周期"
- 提供清晰的说明文字，避免概念混淆

### 4. 布局渲染器（src/features/dashboard/ui/LayoutRenderer.tsx）

#### 工具栏实现
- **概览模式**：TimeNavigator + "按字段粒度过滤"复选框
- **非概览模式**：时间导航按钮 + 过滤输入框 + "按字段粒度过滤"复选框

#### 状态管理
- 本地状态 `useFieldGranularity` 与 `layout.useFieldGranularity` 双向同步
- 切换时通过 `appStore.updateLayout` 持久化到配置

### 5. 数据过滤核心（src/features/dashboard/hooks/useViewData.ts）

#### 过滤决策矩阵

| 模式 | 数据源period规则 | useFieldGranularity | 过滤逻辑 |
|------|-----------------|-------------------|----------|
| 概览 | 有显式规则 | 任意 | 规则 + 概览自定义日期/粒度判断 |
| 概览 | 无规则 | ON | 按条目period选择isSame(contextDate, unit)，未设置/天→按精确日期范围 |
| 概览 | 无规则 | OFF | 仅按精确日期范围 |
| 非概览 | 有显式规则 | 任意 | 规则 + filterByPeriod(宽松) + filterByDateRange |
| 非概览 | 无规则 | ON | filterByPeriod(layoutView) + filterByDateRange |
| 非概览 | 无规则 | OFF | 仅filterByDateRange |

#### 关键函数
```typescript
function getItemGranularity(item: Item): string {
    return item.period || '天'; // 未设置默认为"天"
}
```

### 6. 统计视图（src/features/dashboard/ui/StatisticsView.tsx）

#### 年视图统计口径
- **useFieldGranularity = true**：使用字段粒度门槛（年/季/月层分别统计period=年/季/月的条目）
- **useFieldGranularity = false**：按日期归属统计（不看period字段，按时间窗口归属）
- 周层：始终按日期归属统计（不受开关影响）

#### 其他视图
- 天/周/月/季视图：内部不按period过滤，但受上游useViewData过滤结果影响

## 用户使用场景

### 场景1：仅按时间窗口过滤（默认）
- 开关状态：useFieldGranularity = false
- 行为：只看条目的日期是否在当前时间窗口内，忽略period字段
- 适用于：希望看到时间范围内所有条目的用户

### 场景2：同时按时间窗口和字段粒度过滤
- 开关状态：useFieldGranularity = true
- 行为：既要求日期在时间窗口内，又要求period字段匹配当前视图粒度
- 适用于：有明确粒度标记习惯，希望精确过滤的用户

### 场景3：数据源显式配置
- 数据源filters中配置了period规则
- 行为：优先按数据源规则过滤，与开关无关
- 适用于：特定视图需要固定粒度过滤的场景

## 技术改进点

### 已完成的改进
1. **概览模式UI统一**：在概览模式工具栏中添加"按字段粒度过滤"复选框
2. **统计视图口径统一**：年视图根据开关切换统计方式
3. **文案统一**：使用"字段粒度""粒度序号""初始视图（时间窗）"等标准术语
4. **兜底逻辑移除**：删除非概览模式下"layoutView → period"的混淆耦合

### 核心优势
- **概念清晰**：彻底区分"视图时间窗"与"字段粒度"
- **用户可控**：通过开关明确控制过滤行为
- **优先级明确**：数据源规则 > 开关设置 > 默认行为
- **向后兼容**：未设置period的条目按"天"处理，不影响现有数据

### 技术细节
- 使用宽松过滤策略：`filterByPeriod`对未设置period的条目也保留
- 概览与非概览模式统一开关控制
- 统计视图提供两种口径选择：period门槛 vs 日期归属

## 开发者参考

### 关键文件路径
- 字段定义：`src/core/domain/fields.ts`
- 类型定义：`src/core/domain/schema.ts`
- 过滤工具：`src/core/utils/itemFilter.ts`
- 数据钩子：`src/features/dashboard/hooks/useViewData.ts`
- 设置页面：`src/features/settings/ui/LayoutSettings.tsx`
- 布局渲染：`src/features/dashboard/ui/LayoutRenderer.tsx`
- 统计视图：`src/features/dashboard/ui/StatisticsView.tsx`

### 扩展指南
如需扩展period相关功能，应：
1. 在`fields.ts`中更新字段定义
2. 在`schema.ts`中添加必要的类型定义
3. 在`itemFilter.ts`中添加过滤逻辑
4. 在`useViewData.ts`中集成到决策矩阵
5. 在相应的UI组件中添加控制项

这种架构确保了period概念的一致性和可扩展性，同时为用户提供了清晰的控制选项。
