# Think OS CSS 统一 V3 交付说明

## 版本定位

CSS 统一共规划 **5 版**，本次为第 3 版：Settings、编辑器与 Modal 收敛。

```text
V1 Foundation / Token / Scope / Audit / Gate     已完成
V2 Primitive / MUI Theme Bridge                  已完成
V3 Settings / Editors / Modal 收敛               本次完成
V4 业务 View 统一                                下一版
V5 删除旧体系 / 视觉回归 / 封版                  待开发
```

当前还剩 **2 版**。

## V3 已完成

### 1. Settings 页面骨架统一

以下设置入口已迁移到语义 class 和 Think OS Token：

- General Settings；
- Data Management Settings；
- AI Settings；
- Input Settings；
- Layout Settings；
- Settings Root / Workspace Shell。

统一页面结构：

```text
think-settings-page
├─ think-settings-page__header
├─ think-settings-section
├─ think-settings-field
└─ think-settings-actions
```

固定间距、背景、边框、字号、状态不再写入页面级 `sx`。

### 2. Layout Editor 收敛

`LayoutEditorPanel` 的固定皮肤迁入：

- `src/styles/features/layout-editor.css`

完成：

- Layout 列表、详情、工具栏、空状态；
- View 列表、拖动状态、操作区；
- Freeform 参数与模板区；
- Context Menu 皮肤；
- 响应式和窄容器布局。

只保留 Context Menu 的运行时 `top/left/zIndex` 几何值为内联样式。

### 3. 复杂编辑器统一

以下编辑器已开始真实消费 V2 Primitive 与 Feature CSS：

- Rule Builder；
- Block Manager；
- Fields Editor / Field Row；
- Goal Template Editor；
- Theme Metadata Manager；
- Statistics View Editor。

新增：

- `src/styles/features/settings-editors.css`
- `src/styles/components/native-controls.css`
- `src/styles/components/simple-select.css`

静态皮肤从 TSX 移出，动态 DnD、Grid 列和运行时值继续保留在组件中。

### 4. SimpleSelect 与 Native Controls

`SimpleSelect` 改为语义 class 驱动，并补齐：

- Combobox ARIA；
- 键盘上下移动；
- Enter 选择；
- Escape 关闭；
- Disabled / Open / Selected 状态；
- 可选兼容 `sx`，但不再由内部静态 `sx` 构建皮肤。

Native input/textarea 使用：

- `.think-input`；
- `.think-textarea`；
- `.think-native-field`。

### 5. Modal 结构分层

新增：

- `src/styles/components/modal.css`：共享 Modal Header / Body / Footer / Actions；
- `src/styles/overrides/obsidian-modal.css`：Obsidian 宿主尺寸和 Shell Override。

以下 Native Modal 已添加统一宿主作用域：

- AI Batch Confirm；
- AI Chat；
- AI Text Prompt；
- Check-in Manager；
- Name Prompt；
- Quick Input。

共享 `Modal` 已使用 `ThinkButton` 与 `ThinkIconButton`，固定 Header/Footer/Close 皮肤不再重复。

Check-in Manager 删除运行时 `<style>` 注入，改为静态 scoped CSS。

### 6. FloatingPanel 静态皮肤迁移

FloatingPanel 的以下固定部分已迁入 CSS：

- Header；
- Drag Handle；
- Title；
- Action Area；
- Close Button；
- Body；
- Resize Grips。

只保留运行时窗口坐标、宽高、透明度等几何值。

### 7. 消除 Settings / Statistics 全局冲突

原 `settings.css` 和 `statistics.css` 中的以下跨文件同名规则已清除：

- `.category-item`；
- `.move-button`；
- `.alias-input`；
- `.display-mode-options`。

两个文件现在仅作为兼容入口，不再承载新业务样式。

### 8. CSS Gate V3 合同

CSS Boundary Gate 新增：

- V3 CSS 入口完整性；
- Layout Editor / Settings / Modal 合同；
- Settings 静态 `sx` 上限为 132；
- 禁止旧跨 Feature selector 回流；
- 允许受控 Obsidian `.modal` 宿主 selector；
- Check-in Modal 必须使用 `think-*` 作用域。

新增 4 项治理单元测试。

## 审计变化

| 指标 | CSS V2 | CSS V3 | 变化 |
|---|---:|---:|---:|
| CSS 文件 | 32 | 39 | +7，新增分层 Feature/Component CSS |
| CSS 行数 | 5,880 | 6,932 | +1,052，旧业务 CSS 尚未进入 V5 删除阶段 |
| CSS Rule | 970 | 1,118 | +148 |
| `!important` | 73 | 72 | -1 |
| Token 外硬编码颜色 | 68 | 68 | 无增长 |
| 插件自身裸 class | 239 | 190 | -49 |
| 跨文件重复 class | 51 | 26 | -25 |
| MUI `sx` | 412 | 262 | -150，约 -36% |
| TSX `style` | 187 | 148 | -39，约 -21% |
| Settings 静态 `sx` | 264 初始基线 | 122 | -142，约 -54% |
| CSS Variable 引用 | 739 | 1,062 | +323 |

CSS 行数暂时增长属于双轨迁移阶段：新组件合同先落地，旧业务样式将在 V4 迁移完成后由 V5 删除。

## 验证结果

- Vite production build：通过；
- 1526 个模块完成构建；
- CSS V3 Governance Test：4/4 通过；
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

仓库全量 TypeScript 检查仍存在 V3 之前已存在的类型错误。对 V2 与 V3 的错误集合进行归一化比较后，没有新增错误类别；生产构建正常通过。

## 应用方式

本版不删除文件，是增量覆盖包。应用顺序：

```text
自由布局 V1 → V4
CSS V1
CSS V2
CSS V3
```

将压缩包解压到项目根目录并覆盖同名文件，然后执行：

```bash
npm run build
npm run test:unit -- --runTestsByPath test/unit/cssV3Governance.test.ts --runInBand
npm run css:audit
npm run css-boundary:gate
```

## 下一版

CSS V4 将统一业务 View：

- Progress；
- Heatmap；
- Statistics；
- Timeline；
- Excel；
- Task / Block；
- Freeform Widget；
- View Toolbar、Filter、Empty/Loading/Error；
- 数据色与普通 UI 色彻底分离；
- 继续迁移静态 `style` 和剩余业务 `sx`。
