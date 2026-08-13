# Think OS CSS 与界面元素设计规范

> 版本：1.0.46（Obsidian-native Settings pilot）  
> 适用范围：Think OS Obsidian 插件所有 Settings、Modal、Layout、View、共享组件  
> 目标：建立统一、克制、高信息密度、主题友好、可访问、可维护的视觉系统  
> 编码：UTF-8

---

## 1. 设计原则

### 1.1 视觉性格

Think OS 的界面应表现为：

- 冷静：不过度使用品牌色和强烈阴影；
- 克制：主操作突出，但普通信息不争夺注意力；
- 高信息密度：在 Obsidian 侧栏和分栏中保持效率；
- 内容优先：减少装饰性 Card；Dashboard 的独立 View 保留清晰边框，数据和记录内容优先；
- 层级明确：通过表面、边框、文字层级和间距建立结构；
- Obsidian-native：颜色、字体、圆角、控件密度优先继承 Obsidian 语义变量与当前社区主题；
- 主题友好：不制造孤立的白色、深色或固定品牌色岛屿；
- 可预测：相同元素在任何 View 中拥有相同尺寸、状态和交互。

### 1.2 禁止原则

禁止：

- 每个 Feature 自己决定按钮高度和圆角；
- 使用十六进制颜色构建普通 UI 皮肤；
- 使用裸 `.active`、`.flex`、`.empty` 等全局 class；
- 用 `!important` 修复普通组件优先级；
- 在 TSX `style` 或 MUI `sx` 中重复整套静态组件皮肤；
- 将图表数据颜色用于按钮、边框和页面表面；
- 为动态坐标生成大量 CSS class；
- 只考虑默认浅色主题；
- 用大面积 accent 填充普通 Module Header；accent 只用于选中、焦点和关键状态。

---

## 2. CSS 架构

### 2.1 Cascade Layer

```css
@layer think.reset,
       think.tokens,
       think.foundations,
       think.primitives,
       think.components,
       think.features,
       think.utilities,
       think.overrides;
```

定义：

| Layer | 职责 | 禁止内容 |
|---|---|---|
| reset | 插件根容器内的最小归一化 | 业务 View 规则 |
| tokens | 所有语义变量 | selector 皮肤 |
| foundations | 字体、focus、motion、基础排版 | 具体业务组件 |
| primitives | Button、Input、Card、Table 等原子元素 | Feature 专属布局 |
| components | Field、Filter、Modal、FloatingPanel 等组合组件 | 数据计算相关样式 |
| features | Progress、Heatmap、Statistics 等差异样式 | 重复 Primitive 皮肤 |
| utilities | 极少量单职责辅助类 | 完整组件外观 |
| overrides | Obsidian/MUI 宿主兼容 | 普通组件日常修补 |

### 2.2 推荐目录

```text
src/styles/
├─ main.css
├─ tokens/
│  ├─ semantic.css
│  ├─ density.css
│  └─ data-colors.css
├─ foundations/
│  ├─ scope.css
│  ├─ typography.css
│  ├─ focus.css
│  └─ motion.css
├─ primitives/
│  ├─ button.css
│  ├─ icon-button.css
│  ├─ input.css
│  ├─ selection-control.css
│  ├─ card.css
│  ├─ chip.css
│  ├─ toolbar.css
│  ├─ table.css
│  └─ empty-state.css
├─ components/
│  ├─ field.css
│  ├─ filter.css
│  ├─ modal.css
│  ├─ grouped-container.css
│  └─ floating-panel.css
├─ features/
│  ├─ layout.css
│  ├─ freeform.css
│  ├─ progress.css
│  ├─ heatmap.css
│  ├─ statistics.css
│  ├─ timeline.css
│  ├─ event-timeline.css
│  ├─ excel.css
│  ├─ block-view.css
│  ├─ settings.css
│  └─ ai-chat.css
├─ utilities/
│  ├─ layout.css
│  └─ accessibility.css
└─ overrides/
   ├─ obsidian.css
   └─ mui.css
```

---

## 3. Root Scope 与命名

### 3.1 Root Scope

所有插件控制的根容器必须包含：

```html
<div class="think-os think-os--settings">...</div>
<div class="think-os think-os--layout">...</div>
<div class="think-os think-os--modal">...</div>
```

普通规则：

```css
.think-os .think-button { }
.think-os--settings .think-settings-section { }
```

### 3.2 命名规范

```text
组件：     .think-button
元素：     .think-button__icon
变体：     .think-button--primary
尺寸：     .think-button--sm
状态：     .is-selected / .is-disabled
功能根：   .think-progress-view
局部元素： .think-progress-view__metric
Utility：  .think-u-visually-hidden
```

规则：

- 新共享组件只用 `think-*`；
- 现有成熟 Feature 前缀 `sv-* / tn-* / et-* / bv-* / excel-*` 可在迁移期保留；
- 状态 class 不能单独定义皮肤，必须依附组件，例如 `.think-card.is-selected`；
- 禁止使用 DOM 结构过深的 selector；建议最大 3 层；
- 禁止新增 ID selector；
- 避免 tag selector 影响 Obsidian 宿主元素。

---

## 4. Design Token

### 4.1 颜色 Token

Token 不直接定义“紫色按钮”，而表达语义：

```css
.think-os {
  --think-bg-canvas: var(--background-primary);
  --think-bg-surface-1: var(--background-secondary);
  --think-bg-surface-2: var(--background-secondary-alt, var(--background-modifier-hover));
  --think-bg-elevated: var(--background-primary-alt, var(--background-primary));

  --think-text-primary: var(--text-normal);
  --think-text-secondary: var(--text-muted);
  --think-text-subtle: var(--text-faint);
  --think-text-on-accent: var(--text-on-accent);

  --think-border-subtle: var(--background-modifier-border);
  --think-border-strong: var(--background-modifier-border-hover, var(--background-modifier-border));
  --think-border-focus: var(--interactive-accent);

  --think-accent: var(--interactive-accent);
  --think-accent-hover: var(--interactive-accent-hover);
  --think-danger: var(--text-error);
  --think-warning: var(--text-warning);
  --think-success: var(--text-success);
  --think-info: var(--text-accent);
}
```

使用原则：

- 页面表面只用 `bg-*`；
- 文本只用 `text-*`；
- 边界只用 `border-*`；
- 主操作用 accent；
- Danger 仅用于不可逆操作、错误和严重警告；
- UI 不直接消费 `--think-data-*` 数据色。

### 4.2 数据颜色 Token

```css
.think-os {
  --think-data-1: #4f7cff;
  --think-data-2: #20a675;
  --think-data-3: #e39a2d;
  --think-data-4: #d65b74;
  --think-data-5: #8b68d8;
  --think-data-neutral: var(--text-muted);
}
```

要求：

- 浅色和深色分别校准可读性；
- Heatmap 使用同一色相的强度阶梯；
- 分类图表使用可区分色组；
- 状态色与分类色分开；
- 数据颜色必须有非颜色辅助信息，例如标签、图例、纹理或文本。

### 4.3 间距 Token

```css
--think-space-0: 0;
--think-space-1: 2px;
--think-space-2: 4px;
--think-space-3: 6px;
--think-space-4: 8px;
--think-space-5: 12px;
--think-space-6: 16px;
--think-space-7: 24px;
--think-space-8: 32px;
```

推荐：

| 场景 | 间距 |
|---|---|
| 图标与文字 | 4–6px |
| 同组控件 | 8px |
| 字段标题与输入 | 6px |
| 卡片内部 | 12–16px |
| Section 内组之间 | 16px |
| 大 Section 之间 | 24px |

禁止随意新增 7px、11px、13px、17px 等非标准固定间距，除非是像素对齐需要并有注释。

### 4.4 圆角 Token

```css
--think-radius-xs: 4px;
--think-radius-sm: 6px;
--think-radius-md: 8px;
--think-radius-lg: 12px;
--think-radius-pill: 999px;
```

| 元素 | 圆角 |
|---|---|
| Checkbox、小标签 | 4px |
| Button、Input、Select | 6px |
| Card、Popover | 8px |
| Modal、大型浮层 | 12px |
| Chip/Pill | 999px |

### 4.5 字体 Token

```css
--think-font-xs: 11px;
--think-font-sm: 12px;
--think-font-md: 13px;
--think-font-lg: 14px;
--think-font-xl: 16px;
--think-font-2xl: 18px;
--think-font-3xl: 22px;
--think-font-4xl: 28px;
```

| 用途 | 字号 | 字重 | 行高 |
|---|---:|---:|---:|
| 辅助说明/Badge | 11–12px | 400–500 | 1.3 |
| 默认 UI 文本 | 13px | 400 | 1.45 |
| Button/Input | 13px | 500 | 1.2 |
| 卡片标题 | 14px | 600 | 1.3 |
| Section 标题 | 16px | 600 | 1.3 |
| 页面标题 | 18–22px | 600–700 | 1.25 |
| 大指标 | 22–28px | 600–700 | 1.1 |

数字指标建议使用 `font-variant-numeric: tabular-nums`。

### 4.6 控件高度

```css
--think-control-sm: 28px;
--think-control-md: 32px;
--think-control-lg: 36px;
--think-control-touch: 40px;
```

- 桌面默认：32px；
- 紧凑 Toolbar：28px；
- 主要 Modal 操作：32–36px；
- 触控降级：至少 40px；
- 同一行控件必须对齐到同一高度。

### 4.7 阴影与表面

```css
--think-shadow-0: none;
--think-shadow-1: 0 1px 2px rgba(0,0,0,.08);
--think-shadow-2: 0 4px 14px rgba(0,0,0,.14);
--think-shadow-3: 0 12px 32px rgba(0,0,0,.2);
```

| 层级 | 用途 |
|---|---|
| Surface 0 | 页面背景，无阴影 |
| Surface 1 | 普通卡片，优先边框而非阴影 |
| Surface 2 | Popover/Dropdown，轻阴影 |
| Surface 3 | Modal/FloatingPanel，明显但克制的阴影 |

深色主题阴影应减弱，更多依靠边框和表面差异。

### 4.8 z-index Token

```css
--think-z-base: 0;
--think-z-sticky: 20;
--think-z-dropdown: 100;
--think-z-popover: 200;
--think-z-modal: 400;
--think-z-toast: 500;
--think-z-drag: 600;
```

禁止随意使用 999、9999、99999。

### 4.9 Motion Token

```css
--think-duration-fast: 100ms;
--think-duration-normal: 160ms;
--think-duration-slow: 240ms;
--think-ease-standard: cubic-bezier(.2, 0, 0, 1);
```

仅动画：颜色、透明度、轻微 transform、展开高度。拖动期间不使用慢 transition。

---

## 4.10 Dashboard Module Frame

Dashboard 中一个 Module 代表一个独立 View，因此必须保留完整边界。它不是 SaaS Card，而是 Obsidian workspace panel：

- 外框：1px `--think-panel-border`；
- 圆角：`--think-radius-md`，由 Obsidian `--radius-m` 映射；
- Header：使用 Obsidian secondary/hover surface，不使用常驻 accent 填充；
- Header 与 Content：仅一条 subtle divider；
- Content：与页面主 surface 同背景；
- Selected：只改变边框/状态，不整条染色；
- 默认无 shadow；
- Module Shell 的基础皮肤只能由 `view-shell.modules.css` 定义，normalization 文件不得再次覆盖同一组基础 selector。

## 4.11 Settings 高频工作区

Settings 是日常工作区，不是说明文档：

- 普通 Section 默认 flat，不使用 border + background + radius 三件套；
- Section 之间优先使用标题、12–16px 间距和 1px subtle divider；
- 列表行使用 hairline 分隔，不把每一行做成 Card；
- 只有独立交互区域、危险区域、预览器、复杂 Rule Builder 等真实边界才允许使用容器框；
- 明显的教学型说明默认不常驻显示；
- Helper text 只用于输入约束、保存副作用、不可逆行为、错误/警告和真正不直观的业务语义；
- 可选解释优先进入 tooltip、help icon 或按需展开区域；
- 成功状态应短暂、低噪声，不用长期占位的大型 Alert。

## 5. 元素设计规范

## 5.1 Button

### 尺寸

| 尺寸 | 高度 | 水平 padding | 字号 | 图标 |
|---|---:|---:|---:|---:|
| sm | 28px | 8px | 12px | 14px |
| md | 32px | 12px | 13px | 16px |
| lg | 36px | 14px | 14px | 18px |

### 变体

- Primary：每个区域只保留一个主要动作；accent 背景；
- Secondary：普通边框和 Surface 背景；
- Ghost：无边框或透明背景，用于 Toolbar；
- Danger：仅删除、重置、不可逆操作；
- Link：用于低强度导航，不用于提交动作。

### 状态

```text
default → hover → active → focus-visible → disabled → loading
```

要求：

- Focus 不得仅靠颜色变化；
- Loading 保留按钮宽度；
- Disabled 不允许 hover；
- 图标按钮必须有 `aria-label` 或可见文本；
- Danger 默认不应大面积高饱和，仅 hover/确认时增强。

## 5.2 IconButton

- 默认 32×32px；紧凑 28×28px；触控 40×40px；
- 图标居中，不用文字行高撑尺寸；
- Toolbar 中使用 ghost；卡片危险操作使用 danger ghost；
- 必须有 Tooltip；
- 删除、置顶、锁定等图标状态需要 `aria-pressed` 或明确标签。

## 5.3 Input / Select / Textarea

### 外观

- 默认高度 32px；
- 背景 `surface-0/1`；
- 1px subtle border；
- 6px radius；
- 左右 padding 8–10px；
- Placeholder 使用 subtle text；
- Focus 使用 accent border + focus ring；
- Error 使用 danger border，并在下方显示文本，不只用红色。

### Textarea

- 最小高度 80px；
- 默认可垂直 resize；
- 长文本编辑器可使用 120–200px；
- 禁止固定高度导致内容不可见。

### Select

- 箭头区域不可与文本重叠；
- 多选用 Chip 展示；
- 无结果、加载、错误必须有明确状态。

## 5.4 Checkbox / Radio / Switch

- 视觉尺寸 16–18px；可点击区域至少 28px；
- Label 与控件间距 8px；
- checked/indeterminate/focus-visible 明确；
- Switch 仅用于即时生效的二元状态；
- 需要“保存后生效”的选项使用 Checkbox，不误导为即时切换。

## 5.5 Field

统一结构：

```html
<div class="think-field">
  <label class="think-field__label">名称</label>
  <div class="think-field__control">...</div>
  <p class="think-field__description">说明</p>
  <p class="think-field__error">错误</p>
</div>
```

- Label 13px/500；
- Description 12px secondary；
- Error 12px danger；
- 字段间距 16px；
- 同一行字段在 XS 容器自动变单列；
- 必填标识不可只用红色星号，应有可访问文本。

## 5.6 Card / Surface

### 普通 Card

- 8px radius；
- 1px subtle border；
- 12–16px padding；
- 默认无重阴影；
- Header 与 Body 间距 12px；
- Footer 与 Body 间距 16px。

### 状态

- Hover：仅可点击卡片启用，轻微背景或边框变化；
- Selected：accent border + 弱 accent 背景；
- Locked：降低操作强调，但内容保持可读；
- Dragging：提升 z-index、轻阴影、透明度 0.94；
- Resizing：显示尺寸提示和边界；
- Collapsed：仅显示 Header，不改变原持久化尺寸。

### 禁止

- 每层嵌套都使用边框卡片；
- Card 内再套多个同等视觉权重 Card；
- 普通卡片使用 Modal 级阴影。

## 5.7 Chip / Tag / Badge

| 类型 | 用途 | 高度 |
|---|---|---:|
| Chip | 可交互筛选、可删除标签 | 24–28px |
| Tag | 静态分类标签 | 22–24px |
| Badge | 数量、状态、小提示 | 18–22px |

- Pill radius；
- 文字 11–12px；
- 删除按钮必须可聚焦；
- Selected Chip 使用弱 accent 背景和清晰边框；
- 大量标签需要折叠、换行或横向滚动策略。

## 5.8 Toolbar

- 默认高度 36–40px；
- 控件间 gap 6–8px；
- 使用 `display:flex; align-items:center`；
- 主操作靠右或固定位置，不能随着标签折叠消失；
- SM 容器允许换行；XS 容器将低优先级动作收进 More 菜单；
- Toolbar 不承担 Section 标题的视觉职责，除非是 View Header。

## 5.9 Tabs

- Tab 高度 32–36px；
- 当前项使用底边/背景之一，不同时使用多个高强度状态；
- 支持键盘左右导航；
- 窄容器横向滚动，不压缩到不可读；
- Badge 不改变 tab 高度。

## 5.10 Menu / Dropdown / Popover

- Surface 2；8px radius；shadow 2；
- 最小宽度 160px；最大宽度根据内容 320–420px；
- Item 高度 32px，触控 40px；
- 选中、危险、禁用状态明确；
- 不使用 hover 才能访问的唯一操作；
- 超出视口自动翻转和限高滚动。

## 5.11 Modal

统一结构：

```text
Modal
├─ Header：标题 + 关闭
├─ Body：唯一滚动区域
└─ Footer：次操作 + 主操作
```

规范：

- radius 12px；
- 最大高度约 `min(85vh, available)`；
- Header/Footer 固定，Body 滚动；
- 宽度分 sm 420px、md 640px、lg 860px；
- XS 视口接近全屏并保留安全区；
- Esc 关闭需要遵循未保存确认；
- 初始焦点、焦点陷阱和关闭后焦点恢复完整；
- 宿主兼容 `!important` 只能写在 `overrides/obsidian.css`。

## 5.12 Table / Excel Grid

### 基础

- Header 高度 32–36px；
- Row 紧凑 30px、默认 34px、舒适 40px；
- Cell 水平 padding 8–10px；
- Header 使用 secondary text + 500/600 weight；
- 数值右对齐，文本左对齐；
- 允许横向滚动，不强行压缩关键列。

### 状态

- Hover：弱背景；
- Selected：accent 弱背景 + 左/边界提示；
- Editing：清晰 focus ring；
- Error：边框 + 图标/文本；
- Frozen/Sticky：有分隔阴影或边框；
- Empty：显示统一 EmptyState，而不是只留空白。

## 5.13 List / Tree

- Item 最小高度 30–32px；
- 层级缩进每级 16px；
- 展开按钮与 item 点击区域分离；
- 当前项、选中项、hover 不混淆；
- Drag target 有上/下插入线；
- 长文本截断并提供 Tooltip；
- Theme Tree 等大型树支持虚拟化时，不改变视觉合同。

## 5.14 Section

```text
Section Header
├─ Title
├─ Description
└─ Optional Actions
Section Body
```

- 页面 Section 间距 24px；
- 标题 16px/600；
- Description 12–13px secondary；
- Actions 不挤压标题；窄容器移到下一行；
- Section 不默认加卡片边框，只有需要视觉分组时使用 Surface。

## 5.15 Empty / Loading / Error State

### Empty

- 图标 24–32px；
- 标题 14px/600；
- 说明最大宽度约 360px；
- 最多一个主要动作和一个次动作。

### Loading

- 小区域使用 Spinner/Skeleton；
- 大面积数据使用结构化 Skeleton，避免页面跳动；
- 超过合理时间显示说明；
- Loading 不应清空已有内容，刷新时可保留旧数据。

### Error

- 错误文本说明发生了什么和可执行动作；
- 不只显示红色边框；
- 可恢复错误提供重试；
- 技术详情默认折叠。

## 5.16 Tooltip

- 仅补充说明，不承载完成任务必需的信息；
- 延迟 400–600ms，图标按钮可更短；
- 最大宽度 280px；
- 支持键盘 focus；
- 不在触控设备依赖 Tooltip。

## 5.17 Progress

- 轨道高度 6–8px；
- 小型指标 4px；
- 百分比通过 CSS 变量；
- 不使用颜色作为唯一完成状态；
- 100% 状态可以使用 success，但仍显示数字/文本；
- 多系列进度需要图例或标签，避免仅靠相似色。

## 5.18 View Shell / ModulePanel

统一结构：

```text
View Shell
├─ Header：标题、状态、操作
├─ Toolbar/Filter（可选）
├─ Content
└─ Footer/Pagination（可选）
```

- Header 高度 36–40px；
- 普通模式弱化边框；
- List/Grid/Freeform 共用相同 View Shell；
- Freeform 仅额外显示拖动手柄、resize handle、selected/locked 边界；
- 内部 View 不知道自己处于自由布局，不写 drag/resize CSS。

## 5.19 Freeform Widget

- 编辑模式才显示手柄和 resize 边界；
- 非编辑模式外观应接近普通 Card；
- Dragging 使用 `--think-z-drag`；
- Locked 显示锁定图标与弱状态，不降低正文可读性；
- Resize handle 至少 16×16px 可交互区域；
- 键盘 focus 与 selected 状态可区分；
- 小屏/触控降级为普通列表，不强制自由拖动。

## 5.20 Data Visualization

- UI 表面与数据色分离；
- 图表网格线使用 subtle border；
- 轴、标签使用 secondary text；
- Hover tooltip 使用 Surface 2；
- 数据色在浅/深主题均验证；
- 颜色序列应避免相邻低对比；
- Heatmap 至少提供 5 级强度；
- 重要阈值同时使用线型、图标或文本；
- 图表空状态不能显示一张空坐标系。

---

## 6. 响应式规范

### 6.1 容器档位

| 档位 | 宽度 | 默认行为 |
|---|---:|---|
| XS | `<360px` | 单列；主操作保留；文本截断；复杂图表简化 |
| SM | `360–560px` | 紧凑布局；Toolbar 可换行；表单单列优先 |
| MD | `560–840px` | 常规布局；允许双列表单和中等信息密度 |
| LG | `>840px` | 多列、完整标签、并列图表 |

### 6.2 使用顺序

1. Feature 根使用 Container Query；
2. App Shell、Modal 安全区使用 viewport media query；
3. 数据密度降级由组件逻辑或 class 控制；
4. 明确允许滚动的区域包括 Excel、Table 和 Freeform Canvas；其他区域不应无意横向溢出。

---

## 7. 状态设计合同

所有交互元素至少覆盖：

```text
default
hover
active
focus-visible
disabled
```

适用组件增加：

```text
selected
checked
error
warning
success
loading
readonly
dragging
resizing
locked
collapsed
```

状态优先级：

```text
disabled > error > dragging/resizing > selected/checked > focus > hover > default
```

Focus 必须始终可见，不能因为 selected 或 error 被覆盖。

---

## 8. 静态与动态样式边界

### 8.1 必须进入 CSS

- 固定 display、position 关系；
- padding、gap、radius；
- 字体、行高、文字颜色；
- hover/focus/active/disabled；
- 固定背景、边框、阴影；
- 响应式规则；
- 动画定义；
- 组件尺寸变体。

### 8.2 允许留在 TSX

- Freeform x/y/width/height；
- Timeline top/height；
- Progress 百分比；
- Heatmap 数据颜色强度；
- 动态 Grid 行列；
- 运行时测量结果；
- 真正由 props 计算的一次性数值。

### 8.3 推荐 CSS 变量桥接

```tsx
<div
  className="think-progress"
  style={{ '--think-progress-value': `${percent}%` }}
/>
```

```css
.think-progress::after {
  width: var(--think-progress-value);
}
```

TSX 中不得重复写进度条背景、圆角、高度和 transition。

---

## 9. MUI 使用规范

### 9.1 保留 MUI，但必须通过 Bridge

MUI Theme 必须消费 Think Token，统一：

- palette；
- typography；
- spacing；
- shape；
- Button、IconButton、TextField、Select、Chip、Dialog、Paper、Tabs；
- focus-visible；
- hover/selected/disabled/error。

### 9.2 `sx` 允许范围

允许：

- 动态 Grid 列宽；
- 由 props 决定的有限布局；
- 运行时值；
- 一次性排列关系。

禁止：

```tsx
sx={{
  color: '#...',
  background: '#...',
  borderRadius: 12,
  fontSize: 13,
  boxShadow: '...'
}}
```

作为完整皮肤。

同一类 `sx` 出现两次以上，应抽为 Theme override、Primitive 或共享组件。

---

## 10. 可访问性

- 正文和背景对比符合 WCAG AA；
- 非文本图形和 focus 指示器具有足够对比；
- 所有鼠标操作均有键盘路径；
- Hover 不能是唯一信息入口；
- 颜色不能是唯一状态表达；
- Touch target 推荐 40px，最低不小于 32px；
- 支持 `prefers-reduced-motion`；
- 支持 `forced-colors: active`；
- 图标按钮有可访问名称；
- Modal 有焦点陷阱和关闭后焦点恢复；
- 表格 Header、排序、选中和错误状态对辅助技术可读。

---

## 11. Do / Don't

### Do

```css
.think-os .think-button--primary {
  min-height: var(--think-control-md);
  padding-inline: var(--think-space-5);
  color: var(--think-text-on-accent);
  background: var(--think-accent);
  border-radius: var(--think-radius-sm);
}
```

### Don't

```css
.submit-btn {
  height: 31px;
  padding: 0 13px;
  color: white;
  background: #7c3aed !important;
  border-radius: 10px;
}
```

### Do：动态值

```tsx
<div className="think-heatmap-cell" style={{ '--think-level': level }} />
```

### Don't：静态皮肤内联

```tsx
<div style={{ padding: 12, borderRadius: 8, background: '#fff', color: '#222' }} />
```

---

## 12. 新增组件检查清单

开发新组件前必须回答：

- 是否已有 Primitive 或 Component 可以复用？
- 使用的是语义 Token 还是硬编码值？
- 是否在 `.think-os` Scope 内？
- class 是否有 `think-*` 或明确 Feature Prefix？
- default/hover/active/focus/disabled 是否齐全？
- error/loading/empty 是否需要？
- 浅色、深色和第三方主题是否可读？
- 360px 容器是否可用？
- 是否存在可留在 CSS 的静态 `style/sx`？
- 动态值是否可通过 CSS 变量传递？
- 是否新增了 `!important`？如是，是否属于宿主 override 白名单？
- 是否有截图或 Style Catalog 示例？

---

## 13. 完成标准

该规范真正落地后，应满足：

1. 同一个 Button、Input、Card 在 Settings、Modal、View 和 Freeform 中视觉一致；
2. MUI 和普通 CSS 组件在深浅主题下共享语义；
3. Feature CSS 只描述该 Feature 的结构差异，不重复共享元素皮肤；
4. 动态布局仍保持性能，不因 CSS 统一而生成大量 class；
5. 新增组件可以通过 Token 和 Primitive 快速构建，不再复制 `sx/style`；
6. CSS Gate 能阻止旧问题重新进入代码库。
