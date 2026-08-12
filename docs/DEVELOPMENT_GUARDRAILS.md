# Development guardrails

Think OS is now in a maintenance/product-development phase. New architecture must earn its existence.

Before adding a new Manager, Resolver, Adapter, Planner, Registry or public facade, check whether the behavior can live in an existing owner.

Rules:

1. One business fact should have one truth source.
2. Add a domain abstraction only when there is independent behavior/invariant/state, not merely a different Record type name.
3. Prefer direct internal imports inside a module; public facades are boundary tools, not internal routers.
4. Shared is not a business dumping ground.
5. Do not reintroduce task-line/checkbox persistence semantics.
6. Do not let templates define raw Markdown storage syntax.
7. New custom Record fields should flow through FieldSchema/RecordDraft/Codec rather than requiring a new base entity property.
8. Views should use RecordQuery instead of implementing their own filter/sort/date semantics.
9. Avoid new one-consumer wrapper files unless they own a real invariant or lifecycle boundary.
10. Large changes require real behavior tests; static gates alone are insufficient.
11. When a file grows beyond roughly 300 lines, inspect cohesion before splitting; do not split merely to satisfy a line-number aesthetic.
12. When deleting legacy architecture, delete obsolete tests/gates/docs with it instead of preserving history as runtime governance.
