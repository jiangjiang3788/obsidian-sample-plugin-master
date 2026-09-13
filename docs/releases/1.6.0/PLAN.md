# Think OS 1.6.0 Plan — Presentation Convergence

## Scope

1.6.0 starts from the frozen 1.5.0 Task/Whiteboard convergence baseline. It does not reopen Category, create a Matter domain, or redesign Task persistence.

### Product-facing Record Types

The technical schema registry still contains 12 persisted/internal entity types, but Presentation exposes exactly 10 user-visible Record Types:

1. task
2. energy
3. habit
4. event
5. feeling
6. thought
7. review
8. plan
9. blocker
10. milestone

`task-session` and `task-series` remain internal Task entities and inherit Task presentation.

## Implementation stages

1. Presentation contract: canonical 10-type order, internal Task normalization, semantic CSS ownership.
2. Settings/runtime owner: user color overrides, persistence whitelist, immediate runtime style updates.
3. View convergence: Whiteboard/List/Timeline consume the semantic owner; Whiteboard Source removes visible type prefix; Timeline uses one Record Type identity edge with Goal color as fill only, and Goal Settings exposes explicit per-Goal color control.
4. Timeline interaction contract: normal click edits Task immediately; Ctrl/Meta click opens source; drag commits through semantic Timeline mutation.
5. Regression gates and targeted tests.
6. Release docs, commit and source archive.

## Explicitly deferred

- AI runtime stabilization remains non-blocking because the current user does not use AI.
- Heavy historical Whiteboard pointer suites and full coverage are not the primary non-AI release profile; targeted contracts remain mandatory.
