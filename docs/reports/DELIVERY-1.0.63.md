# Think OS 1.0.63 交付说明

本版继续 1.0.62 的收敛方向，只做 View Registry，不重新改 RecordType/Capture 主链；数据结构不迁移。

## 已完成

- 新增 `src/core/config/views/registry.ts`，建立唯一 `VIEW_DEFINITIONS`。
- `ViewName` / `VIEW_OPTIONS` 从 Registry 派生，删除 `ViewConfig.ts` 的硬编码视图列表。
- 默认 viewConfig 总表从 Registry 派生；Settings Editor 不再维护第二份 default-config registry。
- 自由布局默认宽高统一读取 `VIEW_DEFINITIONS.layout`。
- Viewport deferred placeholder 高度统一读取 `VIEW_DEFINITIONS.layout`。
- 视图类型下拉中文名称统一读取 Registry，不再局部写 label map。
- 模块顶部“新增”能力统一读取 `VIEW_DEFINITIONS.capabilities.headerCreate`，删除 create allowlist。
- Markdown export 配置统一读取 Registry，删除 `exportUtils` 的 viewType -> config map。
- 新建 ViewInstance 自动采用该 View 的默认配置。
- Settings 中切换 View Type 时自动切换到新 View 的默认配置，避免旧 viewConfig 污染。
- Runtime / Settings editor 只保留组件绑定，不拥有重复元数据。
- 新增 `view-registry-convergence-gate`：Registry 与 Runtime / Editor 绑定必须完全一致，并禁止重新出现旧分散列表。
- `view-interaction-convergence-gate` 不再硬编码 9 个 View 名称，改为从 Registry 自动读取。

详细规则见 `docs/VIEW_REGISTRY_CONVERGENCE.md`。

## 本版刻意不做

`viewPropsFactory.ts` 中 Timeline / Excel / Statistics / Heatmap / Energy 的真实运行时差异继续留在 adapter 层。它们是组件运行契约，不属于静态注册元数据；本版不把这些差异伪装成大量 capability flags。

## 数据

1.0.63 不修改 `data.json` / Markdown Record 格式，不需要数据迁移。可以直接沿用 1.0.62 数据。

## 验证

已通过：

- `gate:ui-runtime`（包含新的 `view-registry-convergence-gate`）
- `gate:architecture`
- `gate:quality`
- `gate:records`
- `gate:task-session`（同步修正了 Gate 对 cache schema v14 的过期断言；当前代码本来就是 v15）
- `gate:energy`

完整 Jest/Vite build 仍受当前执行环境缺少本项目完整 `node_modules` 限制；交付说明不会把未运行项目写成已通过。

`gate:stability` 的代码检查已通过，但该 Gate 还要求仓库级 `.github/workflows/ci.yml`；用户提供的源码包本身不包含 `.github`，因此这一项保持明确未通过，不伪造 CI 文件。
