# ThinkOS Whiteboard 1.2.5 R2 — Implementation Result

## 结论

1.2.5 R2 是 **Nested Workbench 可靠性修正版**，没有进入 1.2.6 性能优化。

本轮直接修复两条真机反馈：

1. 二级/深层全屏 Workbench 可能出现“看不到退出入口，像被困住”；
2. 左侧 Record 拖到 Workbench 时，部分位置会错误落到根白板或没有进入当前工作台。

同时把“重启后回根白板”的行为明确为 **ephemeral navigation 合同**：重启不恢复当前浏览层级，但 durable membership / XY 必须恢复。

## 根因与修复

### 1. 深层工作台退出可靠性

根因：原 breadcrumb 处于普通 flow，而 Canvas viewport 是 absolute full-size layer；在真实宿主布局中 breadcrumb 存在被 Canvas 覆盖/挡住的风险。只依赖 breadcrumb 也缺少强制 anti-trap fallback。

R2：

- breadcrumb 改成 absolute overlay，z-index 高于 Canvas viewport；
- Nested Workbench 激活时，Board Tools 左上始终显示：
  - `← 返回上一级工作台`
  - `⌂ 退出到根白板`
- 根 breadcrumb 增加明确 `aria-label="退出到根白板"`；
- `Esc` 在未被输入框/编辑器/selection 消费时逐层回父工作台；
- Back / Forward / Parent / breadcrumb 原 1.2.5 语义保持不变。

因此即使 breadcrumb 的宿主样式将来再出现异常，仍有顶部固定按钮作为退出兜底。

### 2. 左侧 Record → Workbench drop 可靠性

根因：此前 Workbench drop target 用“落下后卡片中心”命中。指针靠近 Workbench 右边/下边时，指针仍在 frame 内，但加上半张卡片宽高后中心会跑出 frame，导致误判为根白板。

R2 改成：

- Source drop 先把 **pointer screen point → world point**；
- 用 pointer world point 直接命中最深可见 Workbench frame；
- 当前已经全屏进入的 Workbench 作为 fallback target：没有命中更深 child 时，drop target 就是 `activeGroupId`；
- 如果指针位于当前工作台中的更深 child frame，则最深 child 优先；
- Source drag 时目标 Workbench 高亮，并显示 `松开加入工作台「名称」`；
- 单条和 1.1.6 多选批量 Source drag 共用该合同。

Card 自身在 Canvas 内移动仍沿用原 card-center hit-test，不被这次 Source pointer hit-test 改写。

### 3. Restart 合同

没有把当前 nested navigation 写入数据文件：

- active Workbench：ephemeral；
- Back/Forward history：ephemeral；
- camera / zoom：ephemeral；
- **重启后回根白板是预期行为**。

但以下必须 durable：

- Workbench `parentGroupId`；
- Item `groupId`；
- Item `x/y/zIndex`；
- Annotation / Edge / Archive 等既有白板数据。

R2 新增 lifecycle regression：重启后先断言 active canvas 回 root，再重新进入原父/子 Workbench，验证卡片仍在原 child group，且不会重新出现在左侧候选。

## 完整测试矩阵

### A. Pure model / contract

- pointer-world Workbench hit-test；
- 指针在 Workbench 右下边缘仍命中；
- 旧 card-center 算法在同点会 miss，用测试固定本次 root cause；
- Nested path / depth 1–4；
- 第 5 层与循环 nesting 拒绝；
- parent subtree translate；
- Back / Forward / branch history；
- Fit Content / Nested Find path。

### B. UI component regression

新增 `whiteboardNestedReliabilityUi.test.tsx`：

- 一级 → 二级全屏进入；
- 顶部 Parent / Root anti-trap 按钮始终存在；
- Parent 按钮回一级；
- Esc 回一级；
- Root 按钮直接退出根白板；
- 左侧单条 Record Pointer drag 到二级全屏 canvas，Store `groupId = child.id`；
- 左侧全选两条后拖任一条，整批 `groupId = child.id`；
- Source candidate 在成功落板后消失；
- remount/restart 后 active canvas 回 root；
- durable item `groupId/x/y` 恢复；
- 再次进入原 child 后卡片可见，且不会重新出现在 Source。

Breadcrumb UI 也新增根 crumb 点击测试，确保能显式 `onEnter(null)`。

### C. Store / persistence regression

既有 WhiteboardStore 测试继续覆盖：

- 4 层 Workbench durable hierarchy；
- parentGroupId 校验；
- group membership；
- batch add / move 原子 mutation；
- restart recovery；
- Archive / Edge / Annotation 兼容。

### D. Real Obsidian E2E 场景（已写入测试代码）

`whiteboard.e2e.ts` 新增 R2 真机场景：

1. 进入一级 Workbench；
2. 进入二级 Workbench；
3. 验证 Parent / Root 退出按钮可点击；
4. 左侧搜索一个 canonical Record；
5. 从 Source 拖到当前二级 Canvas；
6. 直接读取 `Think/whiteboards.json`，断言 `recordId` 对应 item 的 `groupId === childId`；
7. 返回父级、再次进入 child、退出 root；
8. 再次进入 child；
9. reload Obsidian；
10. 重开 Whiteboard 后断言 active canvas 为 root；
11. 再读 `whiteboards.json`，断言 durable child membership 仍存在。

## 本环境实际执行结果

### PASS

- `test:syntax`；
- `test:language`；
- `test:evidence`：109 features；
- `test:surface`；
- `test:system:strict:p2`：P0 40/40、P1 64/64、P2 5/5 全部证据完整；
- `gate:architecture`；
- `gate:records`；
- `gate:task-session`；
- `gate:energy`；
- `gate:ui-runtime`；
- 全项目 `src + test + scripts` TypeScript parser scan：**1025 files / 0 syntax error**；
- dependency-free executable contract harness：screen→world + pointer-edge Workbench hit + active nested fallback **PASS**。

### 与 untouched 1.2.5 完全相同的既有红项

R2 与原始 1.2.5 对照结果相同：

- `gate:quality`：explicit-any budget 已在基线超限；
- `gate:stability`：缺 `.github/workflows/ci.yml`；
- `gate:product`：同一 CI / README release-contract 缺口；
- `test:ci-matrix`：缺 `.github/workflows/think-os-test-v9.yml`；
- `test:result-governance`：基线同样返回失败。

因此这些不是 R2 引入的回归。

### 当前环境无法真实执行

交付 SOURCE 不带 `node_modules`，且当前运行环境无法访问 npm registry（`npm view jest version` 超时），所以无法补装依赖。

已实际尝试：

- `npm test` → 明确失败：Jest 未安装；
- `npm run typecheck` → 明确失败：缺 `node / preact / vite/client` 类型；
- `npm run build` → 明确失败：`vite: not found`；
- Real Obsidian E2E 因没有 build + Obsidian 真机环境，**测试已写入但本环境未执行，不能标 PASS**。

## 真机验收优先级

P0：

1. 二级、三级、四级 Workbench 都能通过顶部 Parent / Root 退出；
2. Esc 可逐层退出（若有 selection，第一次 Esc 先清 selection，下一次退出属于当前优先级设计）；
3. 左侧单条 Record 能拖到当前二级/三级全屏 Workbench；
4. 左侧多选批量拖能整批进入当前 Workbench；
5. 在父级 Canvas 中，把 Source Record 放在 child Workbench 边缘区域也正确进入 child；
6. 重启回 root 后，再进入原 child，卡片 membership / XY 保留。

P1：

- Back / Forward / breadcrumb / Parent / Root 交叉导航；
- Find 深层 reveal；
- Fit Content；
- Undo/Redo 与 nested membership；
- Archive/Restore、Annotation、Edge label、Arrange 与深层 Workbench 联动。

## 版本边界

- 插件版本保持 **1.2.5**；这是 1.2.5 R2 bugfix，不冒充 1.2.6；
- `whiteboards.json version: 1` 不变；
- 不做 culling / spatial index / lazy render；
- 不改变 canonical Record / RecordQuery；
- 不做 parent-local coordinate migration。
