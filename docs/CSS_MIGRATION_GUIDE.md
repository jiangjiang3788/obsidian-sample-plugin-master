# Think OS CSS 迁移指南

> 状态：CSS 统一 V3 Settings / Modal 收敛已启用  
> 目标：在不中断现有界面的前提下，将旧全局 CSS、MUI `sx` 与 TSX 静态 `style` 逐步迁移到统一设计系统。

## 1. V1 的实际边界

V1 已建立：

- `.think-os` 根作用域；
- `think.tokens / think.foundations / ... / think.overrides` Cascade Layer 顺序；
- Semantic、Density、Data Palette Token；
- Typography、Focus、Reduced Motion Foundation；
- CSS Audit；
- CSS Boundary Gate；
- 历史 `!important`、硬编码颜色、裸 class、静态 `sx/style` 基线。

V1 **没有**批量改变业务 View 皮肤。旧 `src/shared/styles/*.css` 暂时保持无 Layer 导入，以保留原优先级。V2–V4 每迁移一个模块，再把该模块规则移动到对应 Layer；V5 删除旧兼容规则。

## 2. 新样式的决策顺序

新增样式前依次判断：

1. 是否已存在 Primitive（Button、Input、Card、Toolbar 等）；
2. 是否只是现有 Primitive 的有限变体；
3. 是否是 Feature 独有布局；
4. 是否为运行时动态值；
5. 是否确实需要宿主 Override。

推荐链路：

```text
Obsidian semantic variable
→ --think-* semantic token
→ Primitive / Component
→ Feature difference
→ controlled override
```

## 3. Class 命名

```text
共享组件       .think-button
组件元素       .think-button__icon
组件变体       .think-button--primary
功能根         .think-progress-view
功能局部元素   .think-progress-view__metric
状态           .think-card.is-selected
Utility        .think-u-visually-hidden
```

禁止新增：

```text
.active
.flex
.empty
.category-item
.move-button
```

状态 class 不能独立定义皮肤，必须依附于组件选择器。

## 4. Token 使用

错误：

```css
.some-card {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 9px;
}
```

正确：

```css
.think-os .think-card {
  background: var(--think-bg-surface-1);
  border: 1px solid var(--think-border-subtle);
  border-radius: var(--think-radius-md);
}
```

图表、Heatmap、等级颜色使用 `--think-data-*`，不能把数据色用于普通按钮和页面边框。

## 5. 静态与动态样式边界

应迁入 CSS：

- 固定 padding、gap、圆角、字体；
- 背景、边框、阴影；
- hover、focus、disabled、selected；
- 响应式与动画。

允许保留在 TSX：

- 自由布局 x/y/width/height；
- Progress 百分比；
- Timeline top/height；
- 动态 Grid 位置；
- 图表根据数据生成的几何值。

动态值优先通过 CSS 变量传递：

```tsx
<div class="think-progress" style={{ '--think-progress-value': `${percent}%` }} />
```

```css
.think-progress::after {
  width: var(--think-progress-value);
}
```

## 6. `!important` 规则

普通组件禁止新增 `!important`。只有 Obsidian/MUI 宿主兼容确实无法通过作用域、Layer 或组件 API 解决时，才允许进入 `overrides/`，并同步更新白名单和原因。

## 7. 开发命令

```bash
npm run css:audit
npm run css-boundary:gate
```

审计报告输出到：

```text
reports/css/css-audit-current.json
```

Gate 会阻止：

- 新裸 class；
- 新增或增长的非白名单 `!important`；
- Token 目录以外的新硬编码 UI 色；
- TSX 中静态 `style={{...}}` 或 MUI `sx={{...}}` 数量增长；
- Root Scope 或主 Layer 入口被删除。

## 8. Feature 迁移步骤

每次只迁移一个 Feature：

1. 记录迁移前 Audit 和截图；
2. 给 Feature 根节点补明确 class；
3. 抽取可复用 Primitive；
4. 将固定皮肤迁入 Feature CSS；
5. 动态值改为 CSS Variables；
6. 保留旧 class alias 一个版本；
7. 浅色、深色、360/560/840px 容器验收；
8. Audit 和 Gate 通过；
9. 下一版删除 alias。

## 9. Pull Request 检查表

- [ ] 所有新 class 使用 `think-*` 或批准的 Feature 前缀；
- [ ] 普通 UI 不含 hex/rgb/hsl；
- [ ] 没有新增普通组件 `!important`；
- [ ] 静态皮肤没有写入 `style`/`sx`；
- [ ] 键盘 `focus-visible` 清晰；
- [ ] 深色主题可读；
- [ ] 窄容器没有非预期溢出；
- [ ] `npm run css:audit` 已查看；
- [ ] `npm run css-boundary:gate` 通过。

## CSS V2 primitive usage

V2 provides both native Preact primitives and a MUI bridge. New shared UI should choose one implementation family per component, but both families consume the same `--think-*` contract.

```tsx
<ThinkButton variant="primary" size="md">保存</ThinkButton>
<ThinkIconButton label="删除" tone="danger" icon={<DeleteGlyph />} />
<ThinkField label="名称" description="用于列表展示">
  <input className="think-input" />
</ThinkField>
<ThinkCard header="标题">内容</ThinkCard>
```

MUI roots must use `ThinkMuiThemeProvider`, not a fixed `ThemeProvider theme={theme}`. Do not add a global `CssBaseline`; Think OS foundations are scoped under `.think-os`.

The development-only catalog is located at `src/shared/ui/dev/StyleCatalog.tsx`. It may be mounted temporarily for screenshot baselines but is not part of the normal user navigation.

## CSS V3 Settings and Modal contracts

V3 turns Settings and Modal surfaces into the first broad consumers of the design system.

### Settings

- Settings pages use `.think-settings-page`, `.think-settings-section`, `.think-settings-field`, and feature-specific `think-*` roots.
- Layout editor rules live in `src/styles/features/layout-editor.css`.
- Goal, field, rule, block, statistics, and theme editor rules live in `src/styles/features/settings-editors.css`.
- Static MUI `sx={{...}}` is permitted only while a legacy editor remains unmigrated. The V3 Settings budget is 132 occurrences and may only decrease.
- `src/shared/styles/settings.css` and `statistics.css` are compatibility files; new editor rules must not be added there.

### Modal

- Shared modal structure lives in `src/styles/components/modal.css`.
- Obsidian host sizing and shell integration live in `src/styles/overrides/obsidian-modal.css`.
- Every native Obsidian modal must add `.think-modal-host` plus an optional size modifier.
- Modal header, body, footer, close action, and check-in manager skin use `think-*` classes.
- Runtime geometry may remain inline; fixed shell skin must not be injected from TypeScript.

### Select and native controls

- Shared select behavior uses `SimpleSelect` with `.think-simple-select` classes.
- Native settings inputs use `.think-input`, `.think-textarea`, and `.think-native-field`.
- Component-specific static padding, border, radius, and state colors belong in CSS; options and runtime values remain in TypeScript.

## CSS V4 business-view contracts

V4 migrates the runtime view surfaces into the governed Feature layer. The following files are the sole owners of their visual skin:

```text
src/styles/features/view-shell.css
src/styles/features/progress.css
src/styles/features/heatmap.css
src/styles/features/statistics.css
src/styles/features/timeline.css
src/styles/features/excel.css
src/styles/features/block.css
src/styles/features/event-timeline.css
```

Rules:

- `ModulePanel` owns only the shared View shell; individual views must not restyle `.think-module`.
- List, Grid and Freeform change placement only. A View's internal surface, spacing and state language must stay identical.
- Business-view CSS uses `--think-*` semantic and data tokens. Fixed hex/rgb/hsl values and ordinary-component `!important` are forbidden.
- Progress keeps only the runtime percentage as an inline CSS custom property.
- Heatmap and chart colors are data values and may remain runtime values, but their empty state, border, focus and spacing belong in CSS.
- Timeline geometry (`top`, `height`, time-axis width) and Excel column widths/menu coordinates remain runtime geometry.
- Every migrated view root is a container-query boundary so embedded, grid and freeform rendering can adapt to available width rather than viewport width.
- The old files under `src/shared/styles/` are compatibility stubs until V5 removes their imports.

V4 regression commands:

```bash
npm run build
npm run css:audit
npm run css-boundary:gate
npm run test:unit -- --runTestsByPath test/unit/cssV4BusinessViews.test.ts --runInBand
```


## CSS V5 final convergence

V5 completes the migration. `src/shared/styles` must not contain CSS files and
`src/styles/main.css` is the only stylesheet entry. Task Execution, Task Row,
Grouped Container and Quick Input host geometry now live in governed owners.

Final rules:

- Run `npm run css:verify` for every style change.
- Hardcoded UI colors outside `src/styles/tokens` are forbidden.
- `!important` is allowed only in the reviewed Quick Input host-geometry override.
- Do not restore compatibility stubs or imports from `src/shared/styles`.
- Use `docs/CSS_VISUAL_REGRESSION.md` for Obsidian screenshot acceptance.
- The budgets in `docs/CSS_FINAL_ARCHITECTURE.md` are ceilings and may only decrease.

V5 regression commands:

```bash
npm run build
npm run css:verify
npm run gate
```
