# ThinkOS Whiteboard 1.2.5 — Implementation Result

## 结论

1.2.5 已完成 **Nested Navigation Polish**，没有进入条件性能版 1.2.6。

本版只收口深层 Workbench 的导航和视图定位，不增加新的 durable whiteboard schema 字段，也不改变 Record / Edge / Annotation / Workbench 真源合同。

## 完成内容

### 1. Back / Forward 子画布历史

- Workbench 全屏进入、breadcrumb 跳转、返回父级会形成 ephemeral navigation history；
- 顶部导航提供 `←` Back、`→` Forward、`↑` Parent 三种独立语义；
- Back 后回到根白板仍保留 Forward，可重新进入刚才的子画布；
- 分叉到新的目标后旧 Forward 自动丢弃，行为与浏览器导航一致；
- 删除当前 Workbench 时 fail-safe 回根白板，不写任何历史到 `whiteboards.json`。

### 2. Fit Content

当前 Nested Workbench 顶部新增 **“适配当前工作台内容”**：

- 统一计算当前可见 Card、Workbench frame、Text / Sticky Annotation 的 world bounds；
- 空子 Workbench 也有最小 frame，因此不会在 Fit 时被忽略；
- Annotation 即使是当前层唯一内容也可被 Fit；
- 自动设置 camera + zoom 让内容完整进入 viewport；
- Fit 最大只到 100%，避免只有一张卡时被突然放得很大；
- 完全空的 Nested Workbench 回到该 Workbench 自身中心；
- Fit 只改 ephemeral camera/zoom，不触碰 Store。

### 3. Nested Find 路径

- 白板查找仍搜索整个 active whiteboard 的 Item projection；
- 命中深层 Workbench 内卡片时，自动 reveal 到目标子画布；
- 搜索区同步显示 `白板 › 父工作台 › 子工作台` 路径；
- breadcrumb 当前层使用 `aria-current="page"` 明确标识；
- Find 不修改卡片 XY、groupId、Edge 或 durable 数据。

### 4. 兼容性

- `Think/whiteboards.json` 继续为 `version: 1`；
- 没有新增 schema 字段；
- 1.2.4 数据无需迁移；
- 1.1.x 的 world/camera、Archive、Selection、Undo/Redo、Nested Workbench、Annotation、Edge label、Arrange 合同保持不变。

## 测试与审计

已通过：

- `test:syntax`；
- `test:language`；
- `test:evidence`，109 个功能条目；
- `test:surface`；
- `gate:architecture`；
- `gate:records`；
- `gate:task-session`；
- `gate:energy`；
- `gate:ui-runtime`；
- 本轮 TS/TSX/MTS 额外 TypeScript transpile syntax 扫描：0 error。

F142 证据：

- unit：navigation history / Find path / Fit bounds；
- UI：Back / Forward / Parent / breadcrumb / Fit content；
- E2E：进入 Workbench → Fit → Back → Forward → Nested Find 路径；
- regression：上述 unit/UI/E2E。

### 基线同红项

与 untouched 1.2.4 对照完全相同：

- `gate:quality`：existing explicit-any budget；
- `gate:stability`：缺 `.github/workflows/ci.yml`；
- `gate:product`：同一 CI / README release-contract 缺口。

这些不是 1.2.5 新增。

### 无法真实执行

SOURCE 不携带 `node_modules`，因此：

- `npm test`：Jest 不存在；
- `npm run typecheck`：依赖类型缺失；
- `npm run build`：Vite 不存在；
- Obsidian 真机 E2E 未实际执行，不能标记为 PASS。

## 1.2.6 决策

1.2.6 仍是**条件性能版**。当前没有用户提供的大白板/深层 Workbench 真机卡顿证据，所以本批次不提前加入 viewport culling、Edge culling、spatial index 或 lazy render。
