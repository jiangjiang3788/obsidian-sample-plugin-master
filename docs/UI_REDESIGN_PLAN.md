# Think OS UI Redesign Plan

> Target: Obsidian-native + Compact + Framed + Low-noise  
> Current release: 1.0.54  
> Progress: Phase 7 Grid / Data convergence complete; Phase 8 is next

## Progress

| Phase | Scope | Status | Release |
|---|---|---|---|
| 0 | Visual baseline / source UI audit | DONE | pre-1.0.44 |
| 1 | Obsidian Host Bridge | DONE | 1.0.44 |
| 2 | Dashboard Module Frame | DONE | 1.0.44 |
| 3 | Toolbar / Actions / Icons | DONE | 1.0.45 |
| 4 | Settings: Theme pilot | DONE | 1.0.46 |
| 5 | Settings system convergence | DONE + refined | 1.0.47-1.0.53 |
| 6 | List / hierarchy views | DONE + refined | 1.0.51-1.0.54 |
| 7 | Grid / data views | DONE | 1.0.54 |
| 8 | Visualization views | NEXT (targeted fixes already landed) | 1.0.52 + 1.0.55 |
| 9 | Modal / Quick Input / AI | TODO | later |
| 10 | Visual regression + UI gates | TODO | later |

## Phase contracts

### 1.0.54 grid / data convergence
- Block/Table task checkbox alignment is normalized in the shared TaskRow contract; theme-provided checkbox offsets are not repaired per View.
- Task timer actions stay next to the task label in list and matrix contexts instead of being pushed to the far edge by flex growth.
- Table and Excel consume one shared data-grid density contract for typography, header height, cell padding, borders, row hover, selection and empty-state rhythm.
- Table owns a single scroll/frame boundary around its matrix instead of inheriting host table styling unpredictably.
- Excel keeps its editable spreadsheet behavior but flattens nested toolbar cards, removes persistent instructional prose, and uses Think controls for ordinary actions.
- Excel column headers use one compact line with lightweight editability metadata instead of a tall two-line badge header.
- Heatmap consumes the same data-view font/border/density tokens, uses container queries for Obsidian Leaf width, and moves repeated-count border colors from TSX hardcoding into data-color CSS tokens.

### 1.0.53 density / interaction correction
- Block task rows use the shared dense row contract; removing dividers must not create oversized whitespace.
- Shared TaskCheckbox alignment is normalized once so Block and Table do not repeatedly drift under Obsidian/community theme checkbox margins.
- Runtime Table receives an explicit matrix-table density class; Excel remains isolated until the Grid/Data phase.
- Energy task separators use text-rhythm `|` separators instead of full-height 1px borders; group rows are tighter and no longer rely on repeated horizontal rules.
- Advanced filter rules are permanently visible and use the same compact add-row interaction as sorting.
- Quick filters and advanced rules are split in code, so a quick-filter rule is not duplicated in the advanced-rule editor.


### 1.0.52 corrective refinement
- Block rows suppress horizontal dividers; hierarchy is expressed by indentation and vertical guides.
- Progress uses the shared wide content measure so ultra-wide leaves do not pull labels, bars and percentages too far apart.
- EventTimeline adopts `date | axis | time | content` and removes per-event card surfaces.
- Energy task groups use flat text items separated by hairlines instead of cadence-colored background chips.
- Global/View filters hide redundant common-filter headings; advanced rules use a borderless lightweight disclosure and muted empty state.
- View Settings section hierarchy uses whitespace rather than repeated horizontal rules; Table editor removes duplicate nested headings.


### Phase 0 - baseline
- Inventory major views and CSS ownership.
- Keep representative light/dark and narrow/wide screenshots for comparison.

### Phase 1 - host bridge
- Feature CSS consumes Think semantic tokens derived from Obsidian.
- Accent is state, not a persistent surface color.

### Phase 2 - module frame
- Every dashboard view remains clearly framed.
- Module header uses host surface instead of a persistent accent bar.
- Module shell has one authoritative CSS owner.

### Phase 3 - toolbar / actions / icons
- Toolbar actions share one control height, border and no-shadow language.
- Icon shapes use the shared Lucide-style ThinkIcon primitive.
- Responsive behavior follows leaf/container width.

### Phase 4 - Settings Theme pilot
- Replace nested decorative cards with flat sections, dividers and compact rows.
- High-frequency Settings do not permanently show obvious instructional prose.

### Phase 5 - Settings system
- Apply the pilot language to Goal, Record Type, Metric, General, Layout, AI and View Editors.
- Settings feature code no longer directly imports MUI controls.
- Settings rows default to left label + right control; only very narrow containers stack.
- RuleBuilder / CommonFilter / FieldPicker use one visual boundary rather than wrapper-on-wrapper controls.
- Layout view ordering uses drag-and-drop rather than forward/back button pairs.

### Phase 6 - list / hierarchy views
- Block, Progress and Energy list families consume the shared `list-system.css` contract.
- Shared row contract owns ordinary row height, divider, hover, selected state, metadata rhythm and hierarchy guide color.
- Block hierarchy remains flat: indentation + guide line, never nested cards.
- Block responsive layout uses CSS container queries instead of JS width state.
- TaskRow opts into list-row skin only in list contexts so Table/EventTimeline inline rendering is not changed accidentally.
- Progress goal/theme rows use shared list density and ThinkIcon chevrons.
- Energy recommendation rows use shared list behavior and shared controls; native feature-owned select skin is removed.
- Task timer actions use ThinkIconButton directly instead of the legacy MUI-backed IconAction wrapper.

### Phase 7 - grid / data views
- Table, Excel and Heatmap share the data-view density/border/selection contract.
- Feature code keeps its own data geometry and editing semantics; ordinary grid surface decisions are centralized.
- Table and Excel use the same compact header/cell rhythm without forcing Heatmap into a literal HTML table.

### Phase 8 - visualization views
- Converge Timeline, Event Timeline, Statistics and Energy visualization typography and interaction states.
- Create a bounded visualization typography scale.

### Phase 9 - modal / quick input / AI
- Converge Quick Input, AI Chat, prompts, confirms, floating panels and timer overlays.
- Prefer Obsidian modal/surface semantics.

### Phase 10 - visual regression / governance
- Add a stable screenshot matrix for light/dark and representative leaf widths.
- Tighten gates against feature-owned static control skins, duplicate shell selectors and ungoverned typography/radius.

## Permanent UI rules

1. Dashboard Module is framed because it is an independent view.
2. Settings section is not framed by default because it is information hierarchy, not an independent widget.
3. Border, background and radius appear only when they communicate a real boundary.
4. Obsidian host semantics are the source of base colors, typography, focus and density.
5. Feature code owns layout and visualization geometry; shared primitives/components own ordinary control and row appearance.
6. Container width is the primary responsive signal inside Obsidian workspace leaves.
7. High-frequency Settings do not read like documentation.
8. A visual convergence is not complete if each feature still owns a separate implementation of the same ordinary UI pattern.
