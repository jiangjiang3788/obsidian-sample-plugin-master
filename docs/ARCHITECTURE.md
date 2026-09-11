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

## Record capture runtime

All user entry points (command, Heatmap, Timeline, view quick-create and edit) converge on one Record input flow:

```text
RecordType + Goal context
        -> GoalTemplateResolver
        -> RecordInputSession
        -> normalize / validate
        -> RecordDraft / Codec
```

Goal is fixed system context for goal-bindable RecordTypes. Create capture requires an enabled direct Goal × RecordType template; absence means the Quick Input create surface must not open for that context. RecordType supplies the structural base that the direct GoalTemplate customizes. No parent-template inheritance and no first-item business fallback are allowed.

## Record Presentation Contract (1.4.0)

Record identity and View layout are separate layers:

```text
Record / RecordType facts
        -> Record Presentation Contract
           - canonical Record Type order
           - semantic Record Type color token
           - derived primaryText
        -> View display-field configuration
        -> View-specific layout/rendering
```

The Core presentation contract is the single owner for facts that remain true after switching Views. A View may choose which fields to show and where to place them, but it must not create a private Record Type ordering/color table or a private type-aware title fallback.

`title` is the real Record field. `primaryText` is a derived display field and never writes back to Record storage. User-explicit `ViewInstance.fields` has higher priority than View defaults; selecting `title` must not silently opt into `primaryText`.

Record Type and Category remain independent dimensions. Type presentation is keyed by canonical `coreBlock`; category ordering/colors are not derived from Record Type presentation.

Whiteboard grid visibility and Record Source collapse are UI preferences. They intentionally live outside the durable Whiteboard store (`Think/whiteboards.json`).
