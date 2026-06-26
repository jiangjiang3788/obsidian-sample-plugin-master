# Goal Center MVP15：目标 × Block 预设表修正说明

## 这次修正的核心

上一版把预设做成了“选一个目标，然后下面展开多个 Block 卡片”的页面。这个方向仍然像一个“预设模板管理页”，不是你要的主界面。

本版改回并强化为：

```text
目标 × Block 预设表
```

- 行：目标
- 列：Block / 记录类型
- 单元格：这个目标下，这个 Block 的多个预设
- 操作：点击单元格新增、编辑、复制、删除、设默认

也就是说，预设不再是一个单独页面；预设直接存在于表格单元格里。

## 为什么要用表格

你的模型不是：

```text
先进入预设管理
再选择目标
再选择 Block
再创建预设
```

而是：

```text
目标 × Block = 预设集合
```

所以最自然的 UI 是矩阵表：

```text
                  任务             打卡              复盘
#照顾好自己       普通任务         运动/饮水/睡眠     周复盘
#产品化/目标中心   开发任务         继承默认           版本复盘
#阅读             阅读任务         继承默认           读书复盘
```

用户不需要理解 `GoalTemplate`、`variantId` 或“模板绑定”。用户只需要看到：某个目标和某个 Block 交叉的位置，有哪些预设。

## 本版具体改动

### 1. 恢复“目标 × Block 预设表”为主界面

`数据管理 → 目标中心 → 预设表` 现在直接显示矩阵表。

不再显示“先选择当前目标”的预设模板页。

### 2. 表格单元格直接显示预设

单元格不再只显示抽象状态，而是尽量展示预设名称：

- 没有预设：显示“继承默认记录方式”
- 1 个预设：显示预设名
- 多个预设：显示前 3 个名称，并提示总数
- 有隐藏预设：在单元格底部提示隐藏数量

### 3. 点击单元格管理该交叉点

点击任意单元格后，进入这个单元格的编辑面板：

```text
当前目标 + 当前 Block
  - 新建预设
  - 复制当前预设
  - 删除当前预设
  - 设为默认
  - 调整顺序
  - 修改字段
  - 修改输出格式
```

这个面板只服务当前表格单元格，不再是独立的“预设模板入口”。

### 4. 去掉用户界面里的“模板”表达

界面文案收敛为：

- 预设表
- 预设单元格
- 默认记录方式
- 输出格式

避免让用户误以为还有一套“预设模板系统”。

## 保留的底层能力

底层仍然保留原来的兼容模型：

```text
GoalTemplate
Goal + Block + variantId
```

但 UI 不把它作为用户主概念。对用户来说：

```text
一个表格单元格 = 一个目标 × 一个 Block = 多个预设
```

## 修改的主要文件

```text
src/features/settings/input/GoalManager.tsx
src/features/settings/input/goalManager/GoalTemplateSection.tsx
src/features/settings/goalTemplates/GoalTemplateMatrix.tsx
src/features/settings/goalTemplates/goalTemplateMatrixModel.ts
src/features/settings/goalTemplates/GoalTemplateEditorModal.tsx
```

## 和上一版的区别

上一版：

```text
预设页
  选择目标
    Block 卡片
      预设列表
```

本版：

```text
目标 × Block 预设表
  目标行 × Block 列
    单元格内直接管理多个预设
```

这版更符合你的要求：

```text
直接就是目标 × Block = 预设
每个目标下创建多个预设
保留表格，不新增独立预设页
```
