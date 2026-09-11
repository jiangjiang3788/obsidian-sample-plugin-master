# ThinkOS Whiteboard 1.2.5 R2 — Test Report

## 目标

针对真机反馈执行 Nested Workbench 专项完整回归：

- 二级/深层 Workbench 必须可退出；
- 左侧单条/批量 Record 必须可靠拖入当前或更深 Workbench；
- 重启后 navigation 回 root，但 durable membership/XY 必须保留；
- 不破坏 1.1.x–1.2.5 既有白板合同。

## 实际执行（本环境）

| 层 | 检查 | 结果 |
|---|---|---|
| Syntax | `npm run test:syntax` | PASS |
| Test language | `npm run test:language` | PASS |
| Evidence | `npm run test:evidence` | PASS，109 features |
| Product surface | `npm run test:surface` | PASS |
| Test system strict | `npm run test:system:strict:p2` | PASS；P0 40/40，P1 64/64，P2 5/5 |
| Architecture | `gate:architecture` | PASS |
| Record boundary | `gate:records` | PASS |
| Task/session | `gate:task-session` | PASS |
| Energy | `gate:energy` | PASS |
| UI runtime | `gate:ui-runtime` | PASS |
| TS parser | `src + test + scripts` 1025 files | PASS，0 syntax error |
| Executable contract harness | screen→world / pointer hit / nested fallback | PASS |
| Quality | `gate:quality` | BASELINE RED，同 untouched 1.2.5 |
| Stability | `gate:stability` | BASELINE RED，同 untouched 1.2.5 |
| Product | `gate:product` | BASELINE RED，同 untouched 1.2.5 |
| Result governance | `test:result-governance` / `测试:完整` | BASELINE RED：缺 v9 workflow，同 untouched 1.2.5 |
| CI matrix | `test:ci-matrix` | BASELINE RED：缺 v9 workflow，同 untouched 1.2.5 |
| Jest | `npm test` | BLOCKED：SOURCE 无 Jest / node_modules |
| Full typecheck | `npm run typecheck` | BLOCKED：缺 node/preact/vite/client types |
| Build | `npm run build` | BLOCKED：vite not found |
| Real Obsidian E2E | 新增 R2 E2E 已写入 | NOT RUN：无 build + Obsidian host |

额外尝试 `npm view jest version` 超时，当前运行环境不能从 npm registry 补装依赖。

## R2 专项用例代码

### Pure model

- Workbench pointer-world hit target；
- pointer 落在右下边缘仍命中；
- 对照旧 card-center hit 在同一点会 miss；
- screen → world 坐标合同；
- nested active group fallback；
- 1–4 层 path/depth 与第 5 层拒绝；
- subtree translate；
- history / Fit / Find path。

### UI/JSDOM regression（已加入 Jest suite）

- 进入二级 Workbench；
- Parent / Root anti-trap 按钮存在；
- Parent 点击退出一级；
- Esc 退出一级；
- Root 点击退出根白板；
- breadcrumb 根按钮调用 `onEnter(null)`；
- 左侧单条 Pointer drag → child groupId；
- 左侧多选两条 → 拖一条 → 两条都进入 child；
- 成功后 Source candidate 消失；
- restart/remount → active root；
- durable groupId/x/y 恢复；
- 再进入 child → 卡片可见。

### Real Obsidian E2E（已加入 suite，待真机执行）

- 一级 → 二级；
- Parent / Root 可点；
- Source Record drag → 二级 Canvas；
- 读取 `Think/whiteboards.json` 验证 `groupId === childId`；
- Parent / Root / 再进入 child；
- reload Obsidian；
- 重开 Whiteboard 后 active root；
- 再读 JSON 验证 durable child membership 未丢。

## 真机 P0 验收

1. 二级、三级、四级工作台顶部退出入口始终可见；
2. Parent、Root、breadcrumb、Esc 都能退出；
3. 左侧单条拖入全屏二级/三级工作台；
4. 左侧批量选择后拖入全屏工作台；
5. 父画布上拖到子 Workbench 边缘也不误落根；
6. 重启回 root 后，重新进入原 child，卡片仍在原位置和原 group；
7. 上述操作后 Undo/Redo、Find、Fit、Archive、Annotation、Edge label、Arrange 不回归。

## 结论

R2 已在当前可执行范围内做到：**测试体系完整、专项用例完整、依赖无关 gate 全过、基线红项逐项对照、真机 E2E 场景已写入但明确未伪报执行。**

最终 PASS 仍需要安装完整依赖并在真实 Obsidian 环境跑 Jest / build / E2E。
