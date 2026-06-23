# MVP11 Data Review

Source baseline: `data.mvp10-cleaned.json` generated from the user's uploaded `data.from-html-presets(1).json`.

## Result

MVP11 data remains compatible with the new domain model:

- Goal count: 9
- Template Variant count: 88
- `inputSettings.overrides`: empty
- Goal-level `granularity`: 0
- Template-level legacy `granularity`: 0
- Legacy defaultValues keys (`legacyOverrideId`, `legacyThemePath`, `goalId`, `goalPath`, `templateId`, `templateSourceType`, period internals): 0
- AI `enabledBlockIds`: empty array, meaning all current `core.*` blocks are available

## MVP11-specific check

AI target model is now block-first:

- `target.blockId` is the primary axis.
- `target.categoryKey` is optional compatibility/display text.
- Data does not need a new migration for this code change because existing Template Variants already use `coreBlockId`, and AI block scope is empty/all-blocks.
