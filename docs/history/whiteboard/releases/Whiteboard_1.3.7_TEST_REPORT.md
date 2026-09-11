# Whiteboard 1.3.7 Test Report

## 本版回归目标

- F139：文字 / Sticky 在 detail / compact 可直接拖；overview 的 T/◆ Locator 也可拖，screen delta 按 zoom 换算，允许负 world 坐标。
- F148：compact / overview 纯 Card selection 可拖回左侧 Record Source 移出白板；drop 被消费后不再 translate；含 Workbench 的 mixed selection 不触发删除。
- F150：Goal / Record Type / Time guide 标签可拖，边框 / 参考线跟随；低倍率换算正确；拖后不误触选择；主白板与 Archive Canvas 同合同。

功能地图仍为 **119 项：P0 43 / P1 71 / P2 5**。

## 本环境真实执行并通过

- `node scripts/testing/audit-test-syntax.mjs`；
- `node scripts/testing/audit-test-language.mjs`；
- `node scripts/testing/audit-test-evidence.mjs`；
- `node scripts/testing/audit-product-surface.mjs`；
- `node scripts/testing/test-system-report.mjs --strict-p2`；
- `node scripts/gates/architecture-gate.mjs`；
- `node scripts/gates/records-gate.mjs`；
- `node scripts/gates/task-session-gate.mjs`；
- `node scripts/gates/energy-gate.mjs`；
- `node scripts/gates/ui-runtime-gate.mjs`。

测试体系报告：**P0 43/43、P1 71/71、P2 5/5，缺失 0**。

架构门禁特别检查：新增低倍率 source-drop 逻辑已从 Workspace 抽到独立 controller；`release-governance` 重新通过，没有把 TSX 大文件预算从 1 个扩大为 2 个。

## 与 untouched 1.3.6 对照的既有红项

`gate:quality` 在 1.3.7 与 untouched 1.3.6 数值完全相同：

- src explicit any：400 / budget 390；
- test explicit any：598 / budget 593；
- scripts：4 / 4；
- total：1002 / budget 987；
- `as any`：620 / budget 605。

因此本修复没有新增 explicit-any 债务。

`gate:product` 中 version-sync 与 manifest 已通过，均为 1.3.7；其余失败来自 1.3.6 源包本身已有的 release baseline：`.github/workflows/ci.yml` 缺失，以及 README release contract 未满足。对 untouched 1.3.6 复跑得到相同基线失败。

## 本环境未能真实执行

SOURCE 不带 `node_modules`。本环境尝试安装依赖未完成，因此不能真实执行并声称通过：

- Jest unit / integration；
- 完整 TypeScript typecheck；
- Vite build；
- Obsidian Webdriver E2E。

新增测试代码已经通过项目自带 TypeScript / TSX 静态语法审计和证据审计，但这不等价于 Jest 真跑。

## 本机建议阻断验证

依赖完整后先跑白板完整链：

```bash
npm run test:whiteboard:full
```

若先快速验证本次三个 UI 回归：

```bash
npm run test:unit -- --runTestsByPath \
  test/unit/whiteboardAnnotationUi.test.tsx \
  test/unit/whiteboardSemanticLayoutUi.test.tsx \
  test/unit/whiteboardSemanticZoomUi.test.tsx
```

真机重点：

1. 新建文字 / Sticky，普通倍率直接拖；降到 overview 后拖 T/◆，再回 100% 检查真实位置；
2. 执行 Goal×Type×Time，拖 Goal / Type / Time 标签，确认对应框线/参考线同步移动且卡片不被偷偷重排；
3. compact / overview 下把单卡或纯 Card 多选 Locator 拖入左侧 Record Source，确认只移出白板、Record 仍在；含 Workbench 的 mixed selection 不应触发移除。
