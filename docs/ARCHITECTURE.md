# Architecture

## Product model

Think OS is a configurable personal Record platform. Most record types are schema + fields + capabilities. Only types with real independent behavior should own domain logic.

Special domains:

- Task: status lifecycle, recurrence, TaskSeries and TaskSession behavior.
- Energy: state observations, recommendation evidence/learning and Task/Session relationships.

## Main dependency direction

```text
platform adapters / app composition
              -> features
              -> core application/domain services
              -> Record foundation
```

`main.ts` is a composition root. Internal modules must not import it for ordinary capabilities.

## Record platform

```text
RecordSchemaDefinition  system-required semantics
RecordCaptureTemplate   user capture structure
FieldSchema             field input/storage/query semantics
MarkdownRecordCodec     storage grammar
RecordRepository        CRUD + transaction boundary
RecordIndex             stable identity/index/integrity
RecordQuery             filter/keyword/date/sort/group
RecordViewItem          consumer projection for view/search surfaces
```

The base Record entity stays small; Task/TaskSeries/TaskSession/Habit/Energy-specific fields do not belong in every Record.

## Settings and Views

Settings edit configuration. View runtime is a product feature and lives outside Settings. View runtime receives RecordQuery/domain data and owns presentation-specific render models.

## Public facades

Module public facades are for crossing real module boundaries. Code inside a module should depend on concrete internal modules rather than importing its own root facade.

Core dependency cycles are not accepted.
