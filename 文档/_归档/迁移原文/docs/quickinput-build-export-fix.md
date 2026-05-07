# QuickInput 构建导出修复

## 问题

构建时报错：

```text
"buildRecordSubmitFeedbackPresentation" is not exported by "src/core/public.ts"
```

原因是 `QuickInputModal.tsx` 从 `@core/public` 引入了 `buildRecordSubmitFeedbackPresentation`，但当前源码中的 `core/utils/recordSubmitFeedback.ts` 没有实现这个函数，`core/public.ts` 也没有显式导出它。

## 修复

1. 在 `src/core/utils/recordSubmitFeedback.ts` 中补齐：
   - `RecordSubmitFeedbackPresentation`
   - `buildRecordSubmitFeedbackPresentation(...)`

2. 在 `src/core/public.ts` 显式导出：

```ts
export { buildRecordSubmitFeedbackPresentation } from './utils/recordSubmitFeedback';
```

## 行为规则

- `success`：成功提示，关闭面板。
- `partial_success`：按“带警告的成功”处理，关闭面板，避免重复保存。
- `conflict`：警告提示，不关闭面板。
- `error / validation_error`：错误提示，不关闭面板。
- `cancelled`：不提示，不关闭面板。
