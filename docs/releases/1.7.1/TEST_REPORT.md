# ThinkOS 1.7.1 — 测试与验收说明

## 一键专项验证

```bash
npm run 验证:连续记录
```

等价英文命令：

```bash
npm run verify:record-continuation
```

该命令**不会**执行 `npm ci`、`npm install` 或 `npx --yes`。它只使用当前项目已经存在的依赖；若依赖不存在，会直接停止并用中文说明缺什么。

在依赖完整的工作环境中，专项命令依次执行：

1. `typecheck:src`
2. Continuation / shared availability 相关 unit tests
3. RecordInput continuation integration test
4. architecture / records / task-session / energy / quality gates
5. production build

## 本次容器内已经实际完成的验证

| 验证项 | 结果 | 备注 |
|---|---:|---|
| 修改 TS/TSX 语法转译检查 | ✅ PASS | 使用环境现有 TypeScript 对 20 个改动 TS/TSX 文件执行 parser/transpile 检查 |
| `architecture-gate.mjs` | ✅ PASS | public API、feature boundary、DI、domain convergence、release governance 通过 |
| `records-gate.mjs` | ✅ PASS | Record schema / query / entity / field 边界通过 |
| `task-session-gate.mjs` | ✅ PASS | Task runtime convergence 与 Timer/View boundary 通过 |
| `energy-gate.mjs` | ✅ PASS | direct Energy 与既有 recommendation pipeline 无架构回归 |
| `quality-gate.mjs` | ✅ PASS | any / refactor budget 等通过 |
| `npm run 验证:连续记录` 的依赖保护 | ✅ PASS | 当前上传源码无 `node_modules`，命令正确停止并明确声明不会安装依赖 |
| Jest / 完整 typecheck / Vite build | ⚠️ 当前环境未执行 | 上传源码没有 `node_modules`；遵循约定，不运行 `npm ci`/`npm install` |

专项命令在当前容器中的预期提示为：

```text
❌ 连续记录验证无法开始：当前项目依赖未就绪。
缺少：
  - node_modules/typescript/bin/tsc
  - node_modules/jest/bin/jest.js
  - node_modules/vite/bin/vite.js
本命令不会执行 npm ci / npm install；请使用你现有的项目依赖环境后重试。
```

## 代码测试覆盖重点

- QuickInput / Continuation 共享 `getCreateAvailableRecordTypes()`；
- template 类型按同 Goal 启用模板过滤；direct 类型（当前为精力）保持直接可创建；
- RecordType 顺序统一使用 canonical 固定顺序：任务 → 精力 → 打卡 → 事件 → 感受 → 思考 → 总结 → 计划 → 阻碍项 → 里程碑；
- completed Task 才生成 continuation；普通 edit-save 不生成；
- application 在保存 / complete 并 refresh canonical Record 后才生成 continuation；
- continuation option 打开对应 locked QuickInput，并继续携带 Goal/date；
- continuation panel 按 resolver 返回顺序渲染，并只委托用户动作；
- Continuation 状态允许外部点击关闭；普通 QuickInput 表单态仍阻止外部关闭；
- QuickInput modal 使用 intrinsic height，不再依赖 `height:100% + flex-grow` 填满宿主高度。

## 真机验收重点

1. 普通 QuickInput 的顶部/纵向大空白是否消失，同时长表单仍可正常滚动；
2. 睡眠等 Goal 完成 Task 后，Continuation chips 是否只出现该 Goal 可创建的类型，并保持与 QuickInput 完全相同的固定顺序；
3. 点击任一 chip 后，来源 modal 是否关闭，新的 RecordType 是否锁定且 Goal/date 正确预填；
4. Continuation 状态点击遮罩可关闭，而普通 QuickInput 编辑态点击遮罩不关闭；
5. X 与“完成”都能安全结束 Continuation；
6. desktop / mobile，尤其软键盘出现时 footer 与最大高度行为是否正常。
