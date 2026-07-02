# MVP_ACCEPTANCE

## MVP user journey

The MVP user journey covers creating records from QuickInput, editing existing records, reviewing business views, and shipping a clean release bundle.

## Acceptance notes

- The release path keeps a bundle budget and is checked by `bundle:gate` / `bundle:report`.
- AI HTTP calls use the Obsidian requestUrl platform transport instead of browser-only APIs.
- QuickInput single-select options must stay visible as option pills rather than hidden dropdown-only controls.
- Record conflict recovery actions must be available inside the modal so users can retry, overwrite, or inspect conflicts.
- Runtime icons come from `@shared/ui/icons`.
- `@mui/icons-material` remains banned from runtime code.

## Gate chain

MVP acceptance includes single-user convergence checks and the final docs gates: final-convergence:gate, docs-governance:gate, any-budget:gate.

## 第二轮深度改造封版验收

V19 将第二轮 V14～V18 的架构收敛结果固化为发布前检查：QuickInput 深拆、CSS 大文件模块化、AI / Retrieval / GoalTemplate 模型拆分、模块级 public 实际迁移、explicit any 预算降低。

发布前建议按 `docs/REFACTOR_ACCEPTANCE_CHECKLIST.md` 执行人工回归，并至少运行：

```bash
npm run refactor:verify
npm run gate
npm run typecheck
npm run build
```

其中 `npm run gate` 已包含 `refactor:budget` 与 `refactor:release`，用于确保大文件、root public import、模块 public facade、explicit any 与验收文档不会反弹。

## 第三轮目录重排与当前 schema 封版验收

V25 将第三轮 V20～V24 的目录归属治理封版：QuickInput 归属 `features/quickinput`，业务视图归属 `features/settings/views`，RecordInput 归属 `core/recordInput`，Obsidian 适配器归属 `platform/obsidian`，shared 只保留通用 UI / hooks / utils。

个人版数据策略已经锁定为当前 schema：

```text
只支持当前 settings schema
不做旧 data.json migration
本地根目录允许 data.json
release 包禁止 data.json
```

发布前建议至少执行：

```bash
npm run refactor:verify
npm run gate
npm run schema:gate
npm run typecheck
npm run build
```

需要实际发布时，再执行：

```bash
npm run build:release
```

## V31 深度收敛封版验收

V31 将 V26～V31 的深度收敛结果固化为最终维护边界：语义函数中心、大文件职责拆分、view config/action 收敛、service ownership 收敛、类型债预算和 final gate。

发布前建议至少执行：

```bash
npm run refactor:verify
npm run gate
npm run deep-refactor-final:gate
npm run any-budget:gate
```

完整本地验证仍需执行：

```bash
npm ci
npm run typecheck
npm run build
npm run test:unit
npm run gate
```

V31 后新增功能必须先通过 `docs/开发防发散提示词.md` 中的 ownership 审查，避免再次产生后期集中整理成本。
