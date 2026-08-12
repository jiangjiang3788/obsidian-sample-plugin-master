# Think OS

Think OS is a single-user Obsidian plugin for recording and organizing personal information around Goals and Themes.

The runtime model is Record-first. Core record kinds include Task, Plan, Review, Thought, Habit, Evidence, Blocker, Milestone and Energy. TaskSeries and TaskSession are specialized domain records used by recurrence and timer/session workflows.

## Architecture

The current data path is:

```text
Capture UI / AI / Form
        -> RecordDraft
        -> RecordSchemaDefinition + FieldSchema
        -> MarkdownRecordCodec
        -> RecordRepository / Transaction / RecordIndex
        -> RecordQuery
        -> Views
```

Templates control the user's capture structure (enabled fields, order, defaults, options and safe custom fields). Templates do not define Markdown storage grammar.

See `docs/ARCHITECTURE.md` and `docs/RECORD_MODEL.md`.

## Development

```bash
npm run gate
npm run typecheck:src
npm run test:unit
npm run test:integration
npm run build
```

For a full local verification pass:

```bash
npm run verify
```

Release packaging:

```bash
npm run build:release
npm run release:check
npm run bundle:report
```

The CI path uses `npm run verify:ci` and `npm run build:release`.

## Product guardrails

- Record IDs are stable identity; file path and line number are not business identity.
- Task status/recurrence/session semantics are structured fields, not checkbox/task-line syntax.
- Record storage uses one codec-owned `key:: value` grammar.
- Templates may add safe custom fields without source-code changes.
- Settings support the current schema only; historical migrations live outside runtime code.
- Views consume RecordQuery/domain projections rather than reimplementing filter/sort/date semantics.
- Internal modules must not depend back on composition roots such as `main.ts`.
- Runtime icons stay local; `@mui/icons-material` is intentionally banned.
- QuickInput single-select options remain visible options, and conflict recovery actions stay inside the modal flow.

## Documentation policy

Only current operational documentation lives in this source package. Historical implementation notes, Energy version notes, old MVP handoff records, demo datasets and architecture phase reports are intentionally archived outside the active source tree.

Start at `docs/README.md`.
