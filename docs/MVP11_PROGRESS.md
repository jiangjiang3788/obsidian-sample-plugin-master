# MVP11 Progress — Stability / Release Candidate Preparation

## Completed in MVP11

1. AI parser prompt is now block-first.
   - `blockId` is the required primary record action axis.
   - `categoryKey` is retained only as optional legacy display/compatibility text.

2. AI schema updated.
   - `NaturalRecordCommand.target.blockId` is required.
   - `target.categoryKey` is optional and marked deprecated.

3. AI normalization tests expanded.
   - Verifies blockId-first output.
   - Verifies categoryKey-only legacy AI output can still be normalized into blockId.

4. Goal updates now ignore legacy `granularity` patches.
   - Goal itself no longer owns period granularity.
   - Period is still owned by plan/review Template Variant `periodPolicy`.

5. Domain gate upgraded.
   - Fails if AI prompt makes `categoryKey` required again.
   - Fails if AI prompt stops making `blockId` required.
   - Fails if GoalUseCase stops stripping legacy goal granularity updates.

6. Data prepared for MVP11.
   - `data.mvp11-cleaned.json` produced from MVP10 cleaned data.
   - No runtime/data-layer migration is included.

## Verified in this environment

Passed:

```bash
npm run domain:gate
npm run core-public:gate
npm run obsidian-leak:gate
npm run feature:gate
npm run arch:gate
```

Not fully runnable in this environment:

```bash
npm run typecheck:src
npm run build
npm run test:unit
```

Reason: this execution environment does not have a full populated `node_modules` tree. `npm ci` could not be completed here.

## Remaining before release candidate

- Run full `npm ci && npm run typecheck:src && npm run test:unit && npm run build` in a local Node environment.
- Fix any TypeScript/test errors surfaced by local checks.
- Package release files (`main.js`, `manifest.json`, `styles.css`) after successful build.
- Markdown record migration is still separate and depends on the user's future Markdown document package.
