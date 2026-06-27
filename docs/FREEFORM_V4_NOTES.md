# Think OS Freeform Layout V4

## Delivery type

Incremental overlay package. No source files need to be deleted.

Apply in this order:

1. V1 incremental package
2. V2 incremental package
3. V3 incremental package
4. V4 incremental package

Extract each package into the project root and overwrite files with the same path.

## V4 scope

V4 is the stabilization and release-hardening version of the freeform layout work.

### Keyboard layout editing

When freeform edit mode is enabled and a card has focus:

- Arrow keys: move the selected card.
- Shift + Arrow keys: resize the selected card.
- PageUp: bring the card to front.
- L: lock or unlock position and size.
- C: collapse or expand the card.
- Escape: clear selection.
- The resize handle also supports Arrow keys.

All keyboard operations use the same grid, minimum-size and canvas-boundary rules as pointer operations.

### Stable z-index model

- Bringing a card to front now normalizes all layer values to `1..N`.
- Existing duplicate, sparse or extremely large z-index values are compacted in one atomic write.
- Layer updates use `updateViewPlacements()` and persist once.
- Placements not belonging to the current Layout are filtered before persistence.

### Rendering performance

- RendererService no longer serializes the complete layouts/viewInstances collection after every settings update.
- Each active Layout owns a render signature containing only that Layout and the ViewInstances it references.
- Editing an unrelated ViewInstance no longer rerenders every active Layout.
- LayoutRenderer uses an ID map instead of repeated array scans for ViewInstance lookup.

### Architecture protection

- Added `freeform-layout-boundary-gate.mjs`.
- Business views and view models are prevented from importing freeform placement, drag or resize concerns.
- Added the freeform boundary rules to `src/app/ARCH_CONSTRAINTS.md`.
- Added keyboard-focus and reduced-motion styles.

### Tests

- Freeform layout model: 15 tests.
- Layout render signature: 2 tests.
- Persistence integration: 1 test.
- Total focused V4 verification: 18 tests.

## Verification performed

- Vite production build: passed, 1517 modules transformed.
- Focused Jest tests: 18/18 passed.
- Public API gate: passed.
- Core public gate: passed.
- Architecture gate: passed.
- Feature isolation gate: passed.
- Settings persistence gate: passed.
- DataStore boundary gate: passed.
- Performance boundary gate: passed.
- No MUI icons gate: passed.
- Freeform layout boundary gate: passed.

The repository-wide TypeScript command still reports existing errors outside the freeform feature. V4 introduced no errors in the production Vite build or the focused test graph.

## Files

See `FREEFORM_V4_FILE_LIST.txt` in the package.
