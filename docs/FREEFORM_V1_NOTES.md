# 自由布局第一版交付说明

## 本版范围

1. Layout 新增 `freeform` 排列模式。
2. 自由布局坐标归属于 `Layout.viewPlacements`，不写入 ViewInstance。
3. 旧布局没有坐标时按视图顺序生成运行时默认位置，不自动修改 data.json。
4. 点击“编辑自由布局”后，可从视图标题栏左侧手柄拖动整个视图。
5. 拖动过程仅使用 dnd-kit 临时 transform；松手后通过 LayoutUseCase 单次持久化。
6. 支持网格吸附、左上/右侧边界限制、画布自动增高和重置位置。
7. 删除或从布局移除 ViewInstance 时同步清理 placement。
8. 复制 Layout 时深拷贝自由布局配置和 placement。
9. 设置页与布局悬浮设置窗统一使用 LayoutEditorPanel。
10. RendererService 改为通过 layoutId 跟踪活动布局，避免重名和改名失效。

## 使用方法

1. 打开布局设置，将“排列方式”改为“自由布局”。
2. 回到布局视图，点击“编辑自由布局”。
3. 按住每个视图标题栏左侧的拖动手柄移动。
4. 松手自动保存；点击“完成布局编辑”退出编辑模式。
5. “重置位置”会清空保存坐标并恢复按视图顺序生成的默认排列。

## 尚未包含

- 拖动改变视图宽高（resize）。
- 自动碰撞避让、对齐线、框选、多选和撤销。
- 锁定、层级编辑和移动端单列降级。
- RendererService 按单个布局做更细粒度订阅。

## 建议总版本数

- V1：自由布局闭环（本包）。
- V2：Resize、边界与内容高度策略。
- V3：锁定、层级、添加/移除体验、移动端降级。
- V4：性能优化、完整集成测试、架构 Gate 与产品化收口。

## 验证记录

已完成：

- 16 个修改/新增 TypeScript、TSX 文件通过 TypeScript `transpileModule` 语法诊断。
- 自由布局纯领域函数通过运行时断言：默认排布、网格吸附、边界限制、画布高度、无副作用删除。
- 以下项目门禁通过：`arch-gate`、`public-api-gate`、`capability-gate`、`feature-gate`、`di-gate`、`dual-system-gate`、`no-mui-icons-gate`、`settings-persistence-gate`、`core-public-gate`、`data-store-boundary-gate`、`shared-view-convergence-gate`、`non-shared-view-convergence-gate`。

未能在当前环境完成完整 `npm run typecheck/build/test`，原因不是本次代码：

1. 原项目 `package.json` 与 `package-lock.json` 不同步，`npm ci` 直接拒绝执行。
2. 当前执行环境无法解析 npm registry 域名，无法重新安装依赖。
3. 原压缩包解压后大量中文文档路径变为 `#Uxxxx`，且缺少门禁要求的 `docs/*` 文件；因此 `single-user-convergence-gate`、`final-convergence-gate` 会在本次修改之外失败。
4. 原项目根目录自带 `data.json`，会触发 `secret-gate`；增量包没有包含或修改该文件。
