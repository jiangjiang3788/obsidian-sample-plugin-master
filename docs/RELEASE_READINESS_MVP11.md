# MVP11 Release Readiness Notes

## Current status

MVP11 is a stable-use candidate, not a final release package.

The domain model is now mostly converged:

```text
Goal → Block → Template Variant → QuickInput / AI → Markdown → View
```

## Strong points

- No runtime data migration.
- No manual convergence button.
- Theme × Block override is no longer the runtime template selector.
- Goal-level period granularity is blocked on new writes/updates.
- Plan/review period is represented through `periodPolicy`.
- Template Variant storage is compacted against CoreBlock defaults.
- AI target selection is block-first.
- View config is normalized away from old category/cycle/template-source axes.

## Known limitations

- Full TypeScript/build/test verification must be run locally with dependencies installed.
- Markdown historical records are not migrated yet.
- Some compatibility fields still exist in core schemas/codecs to parse older records; they are not the new write model.
