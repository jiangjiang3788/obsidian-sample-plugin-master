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
13. Ordinary sibling sections/rows must use shared rhythm tokens before adding dividers; dividers must encode a real structural boundary.
14. Independent UI objects use the shared object-frame contract; feature-local cards/borders require a distinct semantic reason.
15. Visual hierarchy and rhythm/boundary convergence gates are product contracts, not optional cleanup checks.
16. Settings primary navigation is a left rail on desktop and secondary navigation belongs to the active content area; do not reintroduce top-level MUI tabs or segmented controls as navigation.
17. Data-management pages must use shared list/matrix management patterns and must not repeat active navigation labels as competing page headings.

18. Record creation entry points must pass explicit context into the shared Record input flow; they must not own a private template resolver.
19. Business intent must never be inferred from array position (`goals[0]`, `blocks[0]`, etc.). First-item behavior is allowed only for visual focus/navigation.
20. Quick Input create eligibility is an enabled direct Goal × RecordType GoalTemplate. Do not reintroduce RecordType-default create fallback, ancestor-template inheritance, or first-item guessing. Parent Goals without direct templates may only navigate the hierarchy; they are not selected Record context.
21. Think OS UI is globally flat: no feature may introduce box-shadow to buttons, Goal rows, cards, menus, popovers, modals or floating panels.
22. Record Type presentation order/color has one Core owner. Do not add View-local Record Type order arrays, locale sorting, or type color maps.
23. Record Type and Category are independent semantic dimensions. Never reuse Record Type ordering/color merely because `categoryKey` happens to resemble a type label.
24. `title` is a persisted semantic field; `primaryText` is derived presentation. Do not silently replace one with the other when a user explicitly selected fields.
25. User-explicit View fields outrank View defaults. “Smart” presentation may improve defaults but must not rewrite explicit `ViewInstance.fields`.
26. Whiteboard UI preferences (grid/source visibility and similar chrome) must not be persisted into durable board business state unless they become part of the board's actual content model.
27. All substantive documentation lives under `docs/`; the project root keeps only `README.md`, and the legacy `doc/` directory must not return.
