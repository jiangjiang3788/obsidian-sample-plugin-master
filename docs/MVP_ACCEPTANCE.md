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
