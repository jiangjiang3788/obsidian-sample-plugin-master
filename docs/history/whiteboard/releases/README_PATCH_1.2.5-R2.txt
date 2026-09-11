ThinkOS Whiteboard 1.2.5 R2 PATCH

Base:
  ThinkOS 1.2.5 Nested Navigation SOURCE

Scope:
  - Fix nested Workbench anti-trap navigation at depth >= 2
  - Fix left Record Source pointer drop targeting into current/deeper Workbench
  - Add visible Workbench drop feedback
  - Add comprehensive nested reliability unit/UI/E2E regression coverage
  - Keep restart active canvas ephemeral while preserving durable groupId/x/y

Not included:
  - 1.2.6 performance/culling work
  - schema migration
  - parent-local coordinate migration
  - RecordQuery / canonical Record changes

Apply:
  Extract this PATCH over the project root of the 1.2.5 SOURCE, preserving relative paths.
