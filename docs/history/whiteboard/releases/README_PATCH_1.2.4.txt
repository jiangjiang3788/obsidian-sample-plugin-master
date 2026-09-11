ThinkOS Whiteboard 1.2.4 PATCH

Base:
- ThinkOS 1.1.9 Whiteboard Archive / Restore SOURCE

Scope:
- 1.2.0 Whiteboard Undo / Redo
- 1.2.1 Nested Workbench / ⛶ Fullscreen / breadcrumb / max depth 4
- 1.2.2 Text + Sticky spatial annotations
- 1.2.3 Edge free-text labels
- 1.2.4 Context menu + deterministic arrange + selection -> Workbench

Compatibility:
- whiteboards.json remains version: 1
- New persisted fields are optional
- Existing item/group/annotation coordinates remain absolute world coordinates
- No canonical Record or RecordQuery semantic change

Docs:
- New/updated delivery docs are under doc/ only.

Verification:
- syntax/language/evidence/surface + architecture/records/task-session/energy/ui-runtime: PASS
- Relevant Whiteboard TS/TSX/MTS transpile scan: PASS
- Full Jest/typecheck/build: blocked because SOURCE has no node_modules; not reported as PASS
