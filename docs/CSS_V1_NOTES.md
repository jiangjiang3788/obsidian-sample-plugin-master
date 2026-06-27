# Think OS CSS 统一 V1 交付说明

## 版本定位

CSS 统一共规划 **5 版**。V1 是 Foundation 与治理基线，不进行业务 View 大规模换肤。

```text
V1 Foundation / Token / Scope / Audit / Gate
V2 Primitive / MUI Theme Bridge
V3 Settings / Modal 收敛
V4 业务 View 统一
V5 删除旧体系 / 视觉回归 / 封版
```

## V1 已完成

### 1. Design Token

新增：

- `src/styles/tokens/semantic.css`
- `src/styles/tokens/density.css`
- `src/styles/tokens/data-colors.css`

覆盖：

- Canvas、Surface、Text、Border、Accent、Status；
- 字号、字重、行高；
- 间距、控件高度、图标尺寸；
- 圆角、阴影、层级；
- Motion duration/easing；
- Data visualization palette 与 Heatmap palette。

Think OS Token 默认映射 Obsidian Semantic Variables，不建立孤立的固定浅色主题。

### 2. Root Scope

以下入口已具备 `.think-os` 和场景修饰类：

- Settings Workspace；
- 原生 Settings Launcher；
- Layout Renderer；
- Preact Shared Modal；
- 所有平台层 Obsidian Native Modal。

V1 没有批量重命名历史 class；Root Scope 为后续迁移建立安全边界。

### 3. Cascade Layer

生产入口新增固定 Layer 顺序：

```text
think.reset
think.tokens
think.foundations
think.primitives
think.components
think.features
think.utilities
think.overrides
```

V1 只将新 Token/Foundation 放入 Layer。历史 `src/shared/styles/*.css` 暂时保持无 Layer 导入，以避免第一版改变旧 CSS 与 MUI/Obsidian Runtime CSS 的优先级。

### 4. Foundation

新增：

- Root-scoped box sizing；
- Typography utility contract；
- 统一 `focus-visible`；
- Forced Colors focus fallback；
- Reduced Motion；
- Motion Token。

### 5. CSS Audit

新增：

```bash
npm run css:audit
```

报告包含：

- CSS 文件、行数、规则、selector、class；
- `!important`；
- 硬编码颜色；
- CSS variables；
- MUI `sx` 与 TSX `style`；
- 跨文件重复 class；
- 无统一前缀 class。

报告位置：

- `reports/css/css-audit-before.json`
- `reports/css/css-audit-after.json`

### 6. CSS Boundary Gate

新增：

```bash
npm run css-boundary:gate
```

并接入总 `npm run gate`。

Gate 阻止：

- 新增裸全局 class；
- 普通文件新增硬编码 UI 色；
- 非白名单 `!important` 增长；
- TSX 静态 `style={{...}}` 增长；
- MUI 静态 `sx={{...}}` 增长；
- Root Scope 或 Layer 入口被删除。

历史问题以 V1 基线锁定，只能减少，不能继续增长。

### 7. 文档

新增：

- `docs/CSS_DESIGN_SPEC.md`
- `docs/CSS_MIGRATION_GUIDE.md`
- `reports/css/css-compatibility-spike.md`

并在 `src/app/ARCH_CONSTRAINTS.md` 增加 CSS 设计系统边界。

## 审计变化

| 指标 | V4 基线 | CSS V1 | 说明 |
|---|---:|---:|---|
| CSS 文件 | 16 | 23 | 新增 Token 与 Foundation 文件 |
| CSS 行数 | 4790 | 5122 | V1 基础设施增量，非重复业务规则 |
| `!important` | 73 | 73 | 没有增长 |
| Token 外硬编码颜色 | 68 | 68 | 没有增长 |
| 无统一前缀 class | 244 | 244 | 没有增长 |
| MUI `sx` | 419 | 419 | V1 只锁基线，V2/V3 开始下降 |
| TSX `style` | 187 | 187 | V1 只锁基线，V4 开始集中下降 |
| Think Token 定义 | 1 | 109 | 建立完整基础 Token 合同 |

## 验证结果

- Vite production build：通过；
- 1517 个模块完成构建；
- CSS Boundary Gate：通过；
- Public API Gate：通过；
- Core Public Gate：通过；
- Architecture Gate：通过；
- Feature Gate：通过；
- Settings Persistence Gate：通过；
- DataStore Boundary Gate：通过；
- Performance Boundary Gate：通过；
- No MUI Icons Gate：通过；
- Freeform Layout Boundary Gate：通过；
- 构建产物包含 Cascade Layer 和 `--think-*` Token：通过。

## 应用方式

本版不删除文件，是增量覆盖包。先确保已应用自由布局 V1→V4，然后把本压缩包解压到项目根目录，保留相对路径并覆盖同名文件，最后执行：

```bash
npm run build
npm run css:audit
npm run css-boundary:gate
```

## 下一版

CSS V2 将开始产生明显视觉统一成果：

- Button / IconButton；
- Input / Select / Textarea / Checkbox / Switch；
- Card / Surface；
- Chip / Badge；
- Toolbar / Section / EmptyState；
- MUI Theme Bridge；
- 浅色与深色跟随 Obsidian；
- 开发态 Style Catalog。
