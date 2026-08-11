# Think OS Energy 1.0.22 Source Validation

## Scope

Validated-source release for evidence-gated Energy management and bundled synthetic demo data.

## Passed gates

- version-sync-gate
- arch-gate
- feature-gate
- public-api-gate
- core-public-gate
- core-obsidian-gate
- domain-convergence-gate
- di-gate
- di-resolve-gate
- data-store-boundary-gate
- settings-persistence-gate
- modal-promise-gate
- obsidian-leak-gate
- events-boundary-gate
- shared-view-export-gate
- no-mui-icons-gate
- src-console-gate
- performance-boundary-gate
- css-boundary-gate
- current-schema-gate
- refactor-budget-gate
- manifest-gate

## Type / syntax checks

All TS/TSX files modified for 1.0.22 were transpiled with the globally available TypeScript compiler API with zero syntax diagnostics.

A full project `tsc --noEmit` still cannot complete in this container because the uploaded source package does not include the installed type dependencies:

- `node`
- `preact`
- `vite/client`

The user has indicated that the project can be built locally, so this package intentionally remains a source package.

## Core management smoke test

Synthetic in-memory samples produced:

- latest: total 80 / brain 72 / physical 88;
- recovery candidate: `运动 / 活动`, N=3, total +20, brain +20;
- caution candidate: `代码 / 开发`, N=3, total -38, brain -50;
- preserve-capacity guardrail: high-Energy work continuation N=3, >=120min ratio 100%;
- long-session guardrail: >=120min paired N=3, total -38.

## Bundled demo dataset smoke test

The bundled `demo/ThinkOS Energy Demo/` dataset was loaded into the Energy analytics using a dependency-free synthetic loader and produced:

- 47 Energy observations;
- 20 task intervals;
- recent 7-day coverage: 6 sampled / 1 Missing;
- 32 recent samples: 31 realtime / 1 retrospective / 28 detailed;
- recovery: `运动 / 活动`, N=9, mean total +22.7, supported;
- depletion: `代码 / 开发`, N=9, mean total -38.2, supported;
- Lag samples: +6h N=32, +12h N=21, +24h N=36;
- >=120min continuous work: paired N=9, mean total -38.2;
- high-Energy continuation: N=9, >=120min ratio 100%;
- management latest: total 80 / brain 60 / physical 100;
- management recovery candidate: walking / activity;
- management caution candidate: code / development;
- management guardrails: preserve capacity + long-session defense.

## Data integrity

1. Management output is runtime-only and does not modify Energy/task Markdown.
2. Missing remains Unknown; no interpolation is introduced.
3. Personalized candidates require N>=3 and stable existing effect direction.
4. No causal or medical claim is encoded in the management model.
5. Demo data is isolated under `ThinkOS Energy Demo/` and Goal `精力研究示例`.
