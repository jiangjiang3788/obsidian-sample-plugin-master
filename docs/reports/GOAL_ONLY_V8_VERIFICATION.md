# Goal-only V8 verification

Run from the V8 source root:

```bash
npm ci
npm run typecheck
npm run gate:goal-only
npm run gate:records
npm run gate:energy
npm run gate:ui-runtime
node scripts/gates/checks/single-user-convergence-gate.mjs
npm run test:unit
npm run build
```

## Targeted V8 canaries

If the full suite fails, run these first:

```bash
npm run test:unit -- --runTestsByPath \
  test/unit/templateFieldSanitizer.test.ts \
  test/unit/templateCoreFields.test.ts \
  test/unit/core/records/genericRecordDraft.r4.test.ts \
  test/unit/heatmapViewModel.test.ts \
  test/unit/viewToolbarModel.test.ts \
  test/unit/viewDomainFieldPolicy.test.ts \
  test/unit/eventTimelineViewModel.test.ts \
  test/unit/templateFieldAdapter.test.ts
```

Expected behavior:

1. `分类` is a core input field.
2. Template render of `分类 = 闪念/感受` derives `categoryKey=闪念/感受`, `baseCategory=闪念`, `leafCategory=感受`.
3. Thought capture with `分类 = 闪念/思考` persists `记录子类型:: 思考` and does not need persisted template provenance.
4. Heatmap resolves human-facing `任务` to the configured Task block.
5. ViewToolbar fallback filtering is based on current category capability only; Theme selector does not reappear.
6. `categoryKey` remains a category path; `coreBlock` remains RecordType.

## P5 real dashboard performance canary

Reload a dashboard containing many Views with DevTools open. Heavy computations for Views far below the viewport should not all run at startup. Scroll toward a View and verify its computation starts near visibility.
