# Think OS architecture constraints

Think OS uses one canonical classification dimension: a human-readable slash-separated Goal path.

## Domain identity

- A Record persists one `目标` value only.
- A Goal path is both readable text and the canonical classification identity.
- Parent, root and leaf Goal values are derived from the path at runtime.
- Tags remain independent metadata and never act as Goal identity.
- A second classification hierarchy is forbidden.

## Goal templates

- A Goal path × CoreBlock has at most one GoalTemplate.
- GoalTemplate config owns form fields, defaults, output file/header and period policy only.
- Goal context is not stored as an editable template field.
- There is no per-cell preset variant layer.

## Record editing

- Views render projections; projections are never edited as canonical Records.
- Opening a Record from Timeline/Table/Heatmap/etc. resolves the canonical Record by Record ID first.
- Edit backfill starts from the canonical Record snapshot and only then applies the current form template.

## Task time

- Task status and Task time are independent facts.
- Task `startAt`, `endAt` and `expectedDurationMinutes` describe a manual/planned interval.
- TaskSession is execution history and takes precedence when Timeline has sessions for that Task.
- A Task interval may appear on Timeline when no TaskSession exists.

## Settings and persistence

- Local settings are current-only; normal runtime does not migrate old classification formats.
- Persisted Goal rows use one `path` value.
- Runtime compatibility shims must not create another persisted identity.

## Dashboard performance

- Expensive views must not all mount just because one layout contains them.
- Off-screen modules are viewport deferred.
- Shared date selection/query results should be reused by views using the same Record snapshot.
