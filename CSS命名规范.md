# Think Plugin CSS 统一命名规范

## 1. 命名原则

### 1.1 基本原则
- **中文语义化**：使用有意义的中文拼音或英文单词组合
- **层次清晰**：体现组件层级关系
- **功能明确**：从类名能直接理解元素作用
- **简洁易懂**：避免过度缩写，保持可读性

### 1.2 命名结构
```
前缀-模块-组件-元素-状态
think-dashboard-block-title-active
```

## 2. 命名规则

### 2.1 前缀系统
- **`think-`**：插件全局前缀，所有自定义样式必须使用
- **`tp-`**：Think Plugin 简写前缀，用于工具类

### 2.2 模块命名
- **`dashboard`**：仪表板模块
- **`settings`**：设置模块  
- **`timer`**：计时器模块
- **`quickinput`**：快速输入模块
- **`modal`**：模态框模块
- **`form`**：表单模块

### 2.3 组件命名
- **`block`**：内容块
- **`card`**：卡片
- **`button`**：按钮
- **`input`**：输入框
- **`toolbar`**：工具栏
- **`sidebar`**：侧边栏
- **`header`**：头部
- **`footer`**：底部
- **`nav`**：导航

### 2.4 元素命名
- **`title`**：标题
- **`content`**：内容
- **`icon`**：图标
- **`text`**：文本
- **`link`**：链接
- **`image`**：图片
- **`list`**：列表
- **`item`**：列表项

### 2.5 状态命名
- **`active`**：激活状态
- **`disabled`**：禁用状态
- **`loading`**：加载状态
- **`error`**：错误状态
- **`success`**：成功状态
- **`hover`**：悬浮状态
- **`focus`**：焦点状态
- **`selected`**：选中状态

## 3. 具体命名示例

### 3.1 Dashboard 模块
```css
/* 模块面板 */
.think-dashboard-module              /* 模块容器 */
.think-dashboard-module-header       /* 模块头部 */
.think-dashboard-module-title        /* 模块标题 */
.think-dashboard-module-content      /* 模块内容 */
.think-dashboard-module-footer       /* 模块底部 */

/* 工具栏 */
.think-dashboard-toolbar             /* 工具栏容器 */
.think-dashboard-toolbar-button      /* 工具栏按钮 */
.think-dashboard-toolbar-button-active  /* 激活的工具栏按钮 */

/* 视图相关 */
.think-dashboard-view                /* 视图容器 */
.think-dashboard-block-view          /* 块视图 */
.think-dashboard-timeline-view       /* 时间线视图 */
.think-dashboard-statistics-view     /* 统计视图 */
.think-dashboard-heatmap-view        /* 热力图视图 */
```

### 3.2 表单组件
```css
/* 表单字段 */
.think-form-field                    /* 表单字段容器 */
.think-form-field-label             /* 字段标签 */
.think-form-field-input              /* 字段输入框 */
.think-form-field-help               /* 字段帮助文本 */
.think-form-field-error              /* 字段错误信息 */
.think-form-field-required           /* 必填字段标记 */

/* 字段管理器 */
.think-form-field-manager            /* 字段管理器容器 */
.think-form-field-tags               /* 字段标签列表 */
.think-form-field-tag                /* 单个字段标签 */
.think-form-field-selector           /* 字段选择器 */
.think-form-field-suggestions        /* 字段建议列表 */
```

### 3.3 模态框组件
```css
/* 模态框 */
.think-modal                         /* 模态框容器 */
.think-modal-overlay                 /* 模态框遮罩层 */
.think-modal-content                 /* 模态框内容区 */
.think-modal-header                  /* 模态框头部 */
.think-modal-title                   /* 模态框标题 */
.think-modal-close                   /* 关闭按钮 */
.think-modal-body                    /* 模态框主体 */
.think-modal-footer                  /* 模态框底部 */
```

### 3.4 通用组件
```css
/* 按钮 */
.think-button                        /* 基础按钮 */
.think-button-primary                /* 主要按钮 */
.think-button-secondary              /* 次要按钮 */
.think-button-icon                   /* 图标按钮 */
.think-button-text                   /* 文本按钮 */

/* 加载器 */
.think-spinner                       /* 加载器容器 */
.think-spinner-dots                  /* 点状加载器 */
.think-spinner-circle                /* 圆圈加载器 */
.think-spinner-text                  /* 加载文本 */

/* 标签 */
.think-pills                         /* 标签容器 */
.think-pill                          /* 单个标签 */
.think-pill-removable                /* 可移除标签 */
```

## 4. 工具类命名

### 4.1 布局工具类
```css
.tp-flex                            /* display: flex */
.tp-inline-flex                     /* display: inline-flex */
.tp-grid                            /* display: grid */
.tp-hidden                          /* display: none */

.tp-flex-col                        /* flex-direction: column */
.tp-flex-row                        /* flex-direction: row */
.tp-items-center                    /* align-items: center */
.tp-justify-center                  /* justify-content: center */
.tp-justify-between                 /* justify-content: space-between */
```

### 4.2 间距工具类
```css
.tp-m-0, .tp-m-1, .tp-m-2...        /* margin */
.tp-p-0, .tp-p-1, .tp-p-2...        /* padding */
.tp-mt-0, .tp-mt-1, .tp-mt-2...     /* margin-top */
.tp-pt-0, .tp-pt-1, .tp-pt-2...     /* padding-top */
.tp-gap-0, .tp-gap-1, .tp-gap-2...  /* gap */
```

### 4.3 文字工具类
```css
.tp-text-xs                         /* font-size: 0.75rem */
.tp-text-sm                         /* font-size: 0.875rem */
.tp-text-base                       /* font-size: 1rem */
.tp-text-lg                         /* font-size: 1.125rem */

.tp-font-normal                     /* font-weight: 400 */
.tp-font-medium                     /* font-weight: 500 */
.tp-font-semibold                   /* font-weight: 600 */
.tp-font-bold                       /* font-weight: 700 */

.tp-text-center                     /* text-align: center */
.tp-text-left                       /* text-align: left */
.tp-text-right                      /* text-align: right */
```

## 5. 响应式命名

### 5.1 断点前缀
```css
.tp-sm:flex                         /* 小屏及以上显示flex */
.tp-md:hidden                       /* 中屏及以上隐藏 */
.tp-lg:grid                         /* 大屏及以上显示grid */
```

### 5.2 断点定义
- **`sm`**：640px 及以上
- **`md`**：768px 及以上  
- **`lg`**：1024px 及以上
- **`xl`**：1280px 及以上

## 6. 样式组织规则

### 6.1 文件命名
- **`base.ts`**：基础样式
- **`components.ts`**：组件样式
- **`utilities.ts`**：工具类样式
- **`layout.ts`**：布局样式
- **`responsive.ts`**：响应式样式

### 6.2 CSS-in-JS 变量命名
```typescript
// 样式对象命名
export const dashboardStyles = {
  module: { ... },
  moduleHeader: { ... },
  moduleTitle: { ... }
}

// 样式函数命名
export const createButtonStyles = (variant: string) => { ... }
export const getModuleStyles = (isActive: boolean) => { ... }
```

### 6.3 注释规范
```css
/*
 * === 仪表板模块样式 ===
 * 包含模块面板、工具栏、视图等相关样式
 */

/* 模块面板基础样式 */
.think-dashboard-module { ... }

/* 模块头部 - 包含标题和控制按钮 */
.think-dashboard-module-header { ... }
```

## 7. 迁移指南

### 7.1 现有类名映射
```css
/* 旧名 → 新名 */
.module-panel → .think-dashboard-module
.bv-item → .think-dashboard-block-item
.sv-chart → .think-dashboard-statistics-chart
.heatmap-cell → .think-dashboard-heatmap-cell
```

### 7.2 重构优先级
1. **高频使用的组件**：Modal、Button、Form
2. **核心功能模块**：Dashboard 各视图组件
3. **辅助功能模块**：Settings、Timer 等
4. **工具类样式**：布局、间距、文字等

通过遵循这套命名规范，我们可以：
- 提升代码可读性和维护性
- 建立一致的样式架构
- 方便团队协作和代码审查
- 为后续功能扩展奠定基础
