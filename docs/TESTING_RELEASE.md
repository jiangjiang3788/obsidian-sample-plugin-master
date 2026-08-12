# Testing and release

## Fast architecture check

```bash
npm run gate
```

The public gate surface is deliberately small and grouped by governance domain:

```text
gate:product
gate:architecture
gate:records
gate:task-session
gate:energy
gate:ui-runtime
gate:quality
gate:stability
```

Internal checks may be more granular, but historical phase names are not part of the public developer workflow.

## Behavioral verification

```bash
npm run test:unit
npm run test:integration
```

Integration coverage should protect end-to-end boundaries such as:

- Template -> RecordDraft -> Codec -> Parser -> RecordQuery;
- Repository -> Transaction -> rescan -> update/delete/rollback;
- Task + Energy + TaskSession -> RecordIndex integrity.

Prefer behavioral coverage over adding a new static gate for every implementation detail.

## Full local verification

```bash
npm run verify
```

The full path runs type checking, governance gates, unit tests, integration tests and a production build.

## Release

```bash
npm run build:release
npm run release:check
npm run bundle:report
```

Release checks include version synchronization, release-package boundaries and bundle budget/reporting.

CI should run `npm run verify:ci` and `npm run build:release`.
