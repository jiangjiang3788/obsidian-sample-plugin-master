# Think OS UI Visual Hierarchy System — 1.0.57

## Scope

This release is the first system pass inside Phase 10. It does not target individual screenshots. It establishes cross-plugin rules for typography and visual weight so the same semantic role looks the same in Dashboard, Settings, Grid/Data, Visualization and Overlay surfaces.

## System contracts introduced

### Visual weight ladder

All ordinary UI follows this order:

`View Frame > Selected / Active > Control Boundary > Divider > Background`

New semantic tokens centralize those responsibilities:

- `--think-border-frame`
- `--think-border-selection`
- `--think-border-control`
- `--think-border-divider`
- `--think-surface-selection`
- `--think-surface-subtle`

Selection is intentionally weaker than an independent View frame. Table headers and ordinary surfaces no longer compete with the surrounding Module.

### Semantic typography roles

The shared typography system now exposes:

- Page
- View Title
- Section
- Subsection
- Body
- Label
- Meta
- Table Header
- Data Emphasis

Feature CSS should consume these roles instead of creating a private larger/bolder heading scale.

## Main convergence work

- Module title and Toolbar primary information now share the same View Title tier.
- Table / Excel headers use the shared Table Header tier and a subtle surface.
- Grid selection uses the shared medium-weight selection surface/border rather than a strong accent ring.
- Button, IconButton, Chip, Card, SimpleSelect and related selected states share the same selection language.
- Settings page/section/editor headings use semantic roles rather than local font-size/weight decisions.
- Duplicate top-level Settings headings under Data Management, Layout and AI tabs were removed.
- Progress, Energy, Heatmap, Block, Overlay, Quick Input and visualization headings were mapped back to semantic roles where they had local oversized scales.

## Governance

Added:

`scripts/gates/checks/visual-hierarchy-convergence-gate.mjs`

and wired it into `ui-runtime-gate.mjs`.

The gate checks the hierarchy token contract, shared typography roles, Module/Toolbar consumption, Table header/selection weight, selected primitive states, Settings title convergence and removal of known feature-owned oversized title scales.

## CSS metrics

Baseline 1.0.56:

- CSS lines: 8085
- CSS rules: 1576
- selectors: 1912
- duplicate classes across files: 69
- Think variable definitions: 195
- `sx`: 34
- inline `style`: 17

1.0.57:

- CSS lines: 8156 / 8500 budget
- CSS rules: 1580
- selectors: 1919
- duplicate classes across files: 69
- Think variable definitions: 219
- `sx`: 34
- inline `style`: 17
- hard-coded UI colors outside token files: 0

The small CSS increase is intentional: hierarchy decisions moved into named semantic contracts instead of remaining implicit in feature styles. The package remains inside the CSS governance budget.

## Verification

Passed:

- Architecture Gate
- Records Gate
- Task Session Gate
- Energy Gate
- UI Runtime Gate
- CSS Boundary / Governance Gate
- Visual Hierarchy Convergence Gate
- Quality Gate
- syntax-only TypeScript transpile for all modified TSX files

Full project `tsc --noEmit` cannot run in the reconstructed source environment because type definitions for `node`, `preact` and `vite/client` are not installed.

Stability Gate still reports the pre-existing repository issue that `.github/workflows/ci.yml` is absent. No CI workflow was invented as part of a UI release.

## Next system pass

1.0.58 — Rhythm & Boundary System:

- sibling/group/section spacing contract;
- removal of dividers used only as decoration;
- consistent independent-object framing for Layout / AI / configuration objects;
- cross-view vertical rhythm convergence.
