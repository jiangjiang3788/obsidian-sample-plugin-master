# Goal Center MVP17：周期下沉到目标 × Block 预设

## 结论

目标库不再设置统计周期。

目标只回答：**我要追踪什么**。

周期属于记录动作，应该在 **目标 × Block 单元格里的预设表单** 中设置。

因此新的关系是：

```text
目标 = 追踪对象
Block = 记录类型
目标 × Block = 一个预设单元格
预设 = 这个目标下，这个 Block 的一种具体记录方式
周期 = 预设表单属性，默认日，可选周 / 月 / 季度 / 年
```

## 为什么这样改

上一版把统计周期放在目标库里，会导致两个问题：

1. 一个目标可能有多种记录动作，不同动作的统计窗口不同。  
   例如同一个“照顾好自己”目标下：
   - 饮水打卡适合按日统计
   - 运动复盘适合按周统计
   - 体重趋势适合按月统计

2. 目标库变成了配置表。  
   用户进入目标库只是想管理目标，却被要求理解周期，这会让目标库变复杂。

所以周期应该从目标实体下沉到预设表单。

## UI 调整

### 1. 目标库删除周期设置

目标库现在只保留：

- 搜索目标
- 新建目标
- 暂停
- 完成
- 归档
- 删除

不再显示：

- 统计周期文案
- 周期下拉框
- 新建目标时的周期选择

新建目标只需要填写目标路径。

### 2. 目标 × Block 预设表保留

保留你要的矩阵结构：

```text
行 = 目标
列 = Block
单元格 = 这个目标下，这个 Block 的多个预设
```

例如：

```text
#照顾好自己 × 打卡 = 运动打卡 / 饮水打卡 / 睡眠打卡
#照顾好自己 × 任务 = 普通任务 / 习惯任务
```

### 3. 周期进入单元格编辑表单

点击某个单元格后，在预设编辑区可以设置：

- 预设名称
- 统计周期：日 / 周 / 月 / 季度 / 年
- 字段
- 输出位置
- 输出格式

周期默认是“日”。

## 数据模型调整

GoalTemplate 增加：

```ts
granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year'
```

它仍然存储在原有 Goal + Block + variantId 的预设记录上。

不新增独立周期实体。

## 写入逻辑调整

QuickInput 推导周期时优先使用当前预设的周期：

```text
预设周期
→ 旧目标粒度兼容字段
→ 日
```

也就是说，如果某个目标 × Block 预设设置为“周”，快速输入写入时会自动生成周周期；如果没有设置，就按日处理。

## 兼容策略

为了兼容旧数据：

- Goal 上已有 granularity 字段暂时保留。
- UI 不再暴露目标级周期。
- 新建目标仍然写入 day，避免旧逻辑读取空值异常。
- 新逻辑优先读取预设周期。

## 修改文件

```text
src/features/settings/input/goalManager/GoalEntitySection.tsx
src/features/settings/goalTemplates/GoalTemplateEditorModal.tsx
src/core/goal/templates.ts
src/core/services/GoalTemplateResolver.ts
src/app/ui/components/QuickInputEditor/QuickInputEditorContainer.tsx
```

## 验证

尝试运行：

```bash
npm run typecheck:src
```

当前压缩包环境仍然缺少依赖类型：

```text
node
preact
vite/client
```

所以容器内 typecheck 仍然无法完成。建议本地执行：

```bash
npm ci
npm run typecheck:src
npm run build
```
