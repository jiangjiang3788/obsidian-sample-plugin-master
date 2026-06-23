# MVP12 Release Readiness Notes

MVP12 is a stronger stable candidate than MVP11 because it fixes a real syntax-level TypeScript blocker and a Vite 7 / Node type dependency mismatch.

## Release status

Current status: **stable candidate, not final release package**.

## What improved from MVP11

1. TypeScript syntax errors in AI prompt construction were fixed.
2. Version metadata moved from `1.0.9` to `1.0.10` across `package.json`, `package-lock.json`, and `manifest.json`.
3. `@types/node` is now aligned with Vite 7 expectations.
4. Domain gate now checks the dependency constraint and AI prompt quote balance.
5. Cleaned data remains valid under the new Goal × Block × Template Variant model.

## What must still be done before final release

The sandbox dependency install did not complete, so final build verification must be done in a normal local environment:

```bash
npm ci --legacy-peer-deps
npm run typecheck:src
npm run test:unit
npm run build
npm run build:release
```

If these pass, the plugin can be packaged from:

```text
manifest.json
main.js
styles.css
```

or from the release zip created by:

```bash
npm run build:release
```

## Recommended data file

Use `data.mvp12-cleaned.json` as the plugin `data.json` after backing up your current plugin folder.
