# Think OS CSS 统一 V2 交付说明

## 版本定位

CSS 统一共规划 **5 版**，本次为第 2 版：Primitive 与 MUI Theme Bridge。

```text
V1 Foundation / Token / Scope / Audit / Gate     已完成
V2 Primitive / MUI Theme Bridge                  本次完成
V3 Settings / Modal 收敛                         下一版
V4 业务 View 统一                                待开发
V5 删除旧体系 / 视觉回归 / 封版                  待开发
```

## V2 已完成

### 1. 原生 Primitive

新增可复用组件与样式合同：

- `ThinkButton`：primary / secondary / ghost / danger / link，sm/md/lg，loading/disabled；
- `ThinkIconButton`：sm/md/lg、danger、pressed、可访问标签；
- `ThinkField`：label / description / error / required；
- `ThinkCard` / Surface：0/1/2/elevated、selected/locked/dragging；
- `ThinkChip` / `ThinkTag` / `ThinkBadge`；
- `ThinkToolbar` / Group / Spacer；
- `ThinkSection`；
- `ThinkEmptyState`；
- Native Input / Select / Textarea / Checkbox/Radio 基础合同；
- Tabs 基础合同。

所有 Primitive 仅消费 `--think-*` Token，没有新增业务硬编码颜色或 `!important`。

### 2. MUI Theme Bridge

重写 `src/shared/styles/mui-theme.ts`：

- 提供 `createThinkMuiTheme('light' | 'dark')`；
- MUI 保留安全的具体 fallback palette，用于内部颜色计算；
- 实际可见皮肤消费 Think OS CSS Token；
- Button、IconButton、OutlinedInput、Select、Checkbox、Radio、Switch、Card、Paper、Chip、Tabs、Dialog、Menu、Tooltip、Accordion、Alert 等统一尺寸和状态；
- MUI 深浅模式跟随 Obsidian，而不是固定 `mode: light`；
- MUI 和原生 Primitive 使用相同控件高度、圆角、Focus、边框和文字层级。

### 3. 统一主题挂载入口

新增 `ThinkMuiThemeProvider`：

- 监听 `html/body` 的 `theme-dark`、`theme-light` 与 `data-theme`；
- 兼容系统 `prefers-color-scheme` fallback；
- 主题切换时重新生成对应 MUI mode；
- 统一挂载在 `mountWithServices`；
- Obsidian Native Modal 的 Preact 内容统一通过 `renderModalContent` 挂载；
- Settings、Quick Input、AI、Floating Widget、Preact Modal 等不再各自维护固定 Theme。

Settings 根节点已移除全局 `CssBaseline`，避免 MUI Reset 污染 Obsidian 宿主。

### 4. Settings 根入口首批迁移

`SettingsRoot` 与原生设置 Launcher 已移除静态 `sx` 皮肤：

- 宽度、间距、Sticky Tabs、标题和说明使用语义 class；
- MUI Tabs/Button 通过 Theme Bridge 渲染；
- `sx` 总量从 419 降至 412。

复杂 Settings Tab 和表单内部将在 V3 继续迁移。

### 5. IconAction 收敛

共享 `IconAction` 默认挂载 `think-icon-button` Primitive：

- Tooltip 与 aria-label 保持；
- small/medium/large 映射统一尺寸；
- error 映射 danger tone；
- 新增 `pressed` 和 `className`；
- `sx` 仅保留为兼容参数并标记为 deprecated。

### 6. Style Catalog

新增开发态视觉合同目录：

- `src/shared/ui/dev/StyleCatalog.tsx`

并排展示 Native Primitive 与 MUI Bridge，用于后续截图基线和视觉回归。它不会进入普通用户导航。

### 7. Audit 与 Gate 加固

CSS Audit 新增：

- `pluginUnprefixedClasses`；
- `hostFrameworkClasses`；
- 分离插件裸 class 与 MUI 官方宿主 selector。

CSS Boundary Gate 新增：

- V2 Primitive 入口完整性检查；
- MUI Theme Bridge 合同检查；
- 统一挂载入口检查；
- Settings 根节点禁止恢复固定 Theme 或全局 CssBaseline；
- 允许受控使用 MUI 官方 `.Mui*` 宿主 selector。

## 审计变化

| 指标 | CSS V1 | CSS V2 | 结果 |
|---|---:|---:|---|
| CSS 文件 | 23 | 32 | 新增分层 Primitive/Override，不合并成单体文件 |
| CSS 行数 | 5,122 | 5,880 | 新增共享基础合同，旧业务 CSS 尚未删除 |
| `!important` | 73 | 73 | 无增长 |
| Token 外硬编码颜色 | 68 | 68 | 无增长 |
| 插件自身裸 class | 239 | 239 | 无增长 |
| MUI 官方宿主 class | 5 | 15 | 仅集中在 MUI Bridge override |
| MUI `sx` | 419 | 412 | 减少 7 处 |
| TSX `style` | 187 | 187 | 无增长，V4 集中清理 |
| Think Token 定义 | 109 | 115 | Primitive 增加局部尺寸变量 |
| CSS Variable 引用 | 494 | 739 | 新组件全面消费 Token |

## 验证结果

- Vite production build：通过；
- 1526 个模块完成构建；
- MUI Bridge 单测：2/2 通过；
- CSS Boundary Gate：通过；
- Public API Gate：通过；
- Core Public Gate：通过；
- Architecture Gate：通过；
- Feature Gate：通过；
- Shared Runtime Boundary Gate：通过；
- Settings Persistence Gate：通过；
- DataStore Boundary Gate：通过；
- Performance Boundary Gate：通过；
- No MUI Icons Gate：通过；
- Freeform Layout Boundary Gate：通过。

仓库全量 TypeScript 检查仍存在 V2 之外的既有类型错误；本次新增/修改的 CSS V2 文件经过滤检查没有新增类型错误，生产构建正常通过。

## 应用方式

本版不删除文件，是增量覆盖包。应用顺序：

```text
自由布局 V1 → V4
CSS V1
CSS V2
```

将压缩包解压到项目根目录并覆盖同名文件，然后执行：

```bash
npm run build
npm test -- --runTestsByPath test/unit/thinkMuiTheme.test.ts --runInBand
npm run css:audit
npm run css-boundary:gate
```

## 下一版

CSS V3 将迁移高风险设置与弹窗区域：

- Settings Page / Section / Field / Toolbar；
- Layout Editor；
- Goal / Field / Theme 编辑器；
- Modal Header / Body / Footer；
- 将 `modals.css` 拆成组件样式与 Obsidian Override；
- 消除 `settings.css` 与 `statistics.css` 的跨文件同名规则；
- 继续大幅减少静态 `sx`。
