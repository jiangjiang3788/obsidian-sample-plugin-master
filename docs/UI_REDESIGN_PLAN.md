# Think OS UI Redesign Plan

> Target: Obsidian-native + Compact + Framed + Low-noise  
> Current release: 1.0.59  
> Progress: Phase 10C Settings IA System complete; Interaction & Content convergence is next

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
| 8 | Visualization views | DONE | 1.0.52 + 1.0.55 |
| 9 | Modal / Quick Input / AI | DONE | 1.0.56 |
| 10 | Visual regression + UI governance | IN PROGRESS | 1.0.57+ |

## Phase contracts

### 1.0.59 Settings IA system
- Desktop Settings uses one left primary navigation rail (`数据管理 / 布局 / 通用 / AI`) and keeps page-specific secondary navigation inside the content area. Narrow Settings containers fall back to a horizontal primary nav through a container query.
- Settings navigation is a dedicated `SettingsNavigation` pattern rather than a form segmented control or MUI Tabs implementation.
- Data Management uses one secondary navigation row (`记录类型 / 目标 / 主题 / 指标`) and content starts directly below it; active navigation labels are not repeated as page headings.
- Record Type management is one management list. Energy defaults participate in the same record-type row language instead of living as a separate section above the list.
- Goal management is one create row followed by one matrix workspace. The legacy `整理预设` action and the permanent Record Type filter-chip row are removed from the daily workflow.
- Goal template matrix search/collapse actions use the shared management toolbar; all enabled Record Type columns remain visible and template add actions use the same compact row height as existing templates.
- Theme management follows the same management pattern: status/search toolbar, one labeled create row, then the managed object list. `主题管理 / 主题列表` duplicate headings are removed.
- Metrics begins directly with its form/list content instead of repeating `目标指标` under the active `指标` navigation.
- `settings-ia-convergence-gate.mjs` is part of the UI runtime gate and prevents Settings from drifting back to top MUI tabs, repeated headings or stacked special-case management sections.

### 1.0.58 rhythm & boundary system
- Vertical rhythm is semantic rather than feature-local: `row < related < group < section < major`, backed by shared rhythm tokens in `tokens/density.css`.
- Ordinary sibling rows and Settings sections use whitespace as the primary grouping signal; dividers are reserved for real structural boundaries such as header/body/footer, data grids and axes.
- Independent objects opt into the shared `think-object-frame` contract. Dashboard Views remain strongly framed; saved Layouts and independent Theme objects use restrained object frames; ordinary Sections/Rows stay flat.
- Block, Progress and Energy hierarchy families no longer depend on repeated horizontal rules to show sibling structure.
- Data Grid keeps explicit outer and cell boundaries because those borders carry data structure; its outer frame remains visually stronger than internal cell lines.
- Settings editors, RuleBuilder, modal bodies and overlays consume the same rhythm scale instead of inventing page-specific margins.
- Layout and Theme management now express object independence through the shared frame contract instead of custom card skins.
- `rhythm-boundary-convergence-gate.mjs` is part of the UI runtime gate and prevents ordinary list/section dividers or feature-local object boundaries from drifting back in.

### 1.0.57 visual hierarchy system
- Typography is semantic: page/modal title, view title, section, subsection, body, label, meta and table header are named roles owned by `tokens/semantic.css` + `foundations/typography.css`.
- Feature views no longer make themselves look important by inventing a larger title or heavier weight. Dashboard Toolbar and Module title intentionally share one visual level.
- Visual-weight order is explicit and shared: **independent View Frame > selected state > ordinary control > divider**. Background remains the quietest layer.
- Table/Excel headers use the table-header role and a subtle surface; selection uses a medium selection surface + 1px selection boundary instead of a heavy accent ring.
- Shared selected primitives (Button pressed, IconButton pressed, Chip, Card, Select option) consume the same selection tokens.
- Progress, Heatmap, Block, Energy task surfaces, Settings editors and overlays consume semantic typography roles instead of feature-local title scales.
- Top-level Settings tabs are not repeated as competing page headings. Data Management, Layout and AI content starts directly with its real controls/sections.
- `visual-hierarchy-convergence-gate.mjs` locks these contracts into the UI runtime gate so future feature work cannot silently reintroduce oversized headings or stronger-than-frame selection states.

### 1.0.56 overlay system convergence
- Quick Input, AI Chat, AI batch confirm, prompts, check-in management, timer overlays and floating panels consume one shared overlay contract for header/body/footer rhythm, close actions, scrolling and compact surface density.
- Obsidian owns the outer modal surface; Think OS does not add a second decorative card around ordinary modal content.
- Daily-use overlays remove permanent instructional prose when the action is already obvious from label, placeholder or control state.
- Phase-9 feature code does not directly import MUI controls. Ordinary actions use Think primitives; specialized semantic row/pill controls may remain native when they own a distinct interaction contract.
- AI message presentation is flat by default: assistant output is content, not a nested card; user/system distinctions use restrained semantic state rather than repeated bordered containers.
- Quick Input operation modes use the shared segmented-control language; prompt/footer actions use the same button contract as Settings and Dashboard.
- Floating panel and modal headers share icon/action treatment, including a consistent close action even when custom right-side actions are present.
- Overlay styles move static visual decisions out of TSX; Phase-9 `sx`/inline-style usage is reduced rather than replaced with feature-local styling.
- CSS governance remains inside budget after convergence; retired overlay/MUI override rules are deleted instead of being kept as compatibility layers without callers.

### 1.0.55 visualization convergence
- Timeline, EventTimeline, Statistics and Energy consume one shared `components/visualization.css` contract for bounded visualization typography, axis/meta labels, guide contrast, track surfaces, hover/focus language and empty states.
- Visualization feature CSS owns only data geometry and data colors; ordinary typography/surface decisions no longer drift independently by View.
- Timeline removes the retired TimeNavigator stylesheet, moves task-block skin from TSX into CSS variables, uses shared Think icon actions, and reuses the data-grid contract for summary tables.
- EventTimeline stays `date | axis | time | content`, but adopts the shared compact row rhythm and visualization label scale.
- Statistics removes retired controls/responsive styles, replaces viewport media rules with container queries, and expresses period hierarchy through indentation + chart baselines rather than repeated horizontal separators.
- Energy maps use Think host-bridge tokens, container queries and the shared visualization scale; persistent encoding tutorial text is removed from the daily-use surface.
- Visualization CSS governance is back inside the project budget: 8500 lines, with no hardcoded UI colors outside token files.
- Module headers regain keyboard collapse/expand semantics discovered by the full interaction gate; phase gates must pass before a visual phase is considered complete.

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
Phase 10 is executed as cross-plugin systems rather than screenshot-by-screenshot fixes:

1. **1.0.57 Visual Hierarchy System — DONE**
   - semantic typography roles;
   - frame / selection / control / divider weight order;
   - shared selected-state language;
   - repeated top-level Settings headings removed;
   - hierarchy rules enforced by gate.
2. **1.0.58 Rhythm & Boundary System — DONE**
   - vertical rhythm and sibling/group/section spacing;
   - divider removal where spacing already carries hierarchy;
   - independent-object boundary rules for Layout/AI/config objects.
3. **1.0.59 Settings IA System — DONE**
   - desktop left primary navigation + content-area secondary navigation;
   - Data Management list/matrix patterns;
   - Goal management flow cleanup.
4. **1.0.60 Interaction & Content System — NEXT**
   - Add/Search/Reorder/Manage interaction consistency;
   - remaining instructional text cleanup;
   - Quick Input context selector vs field editor hierarchy.
5. **1.0.61 Visual Regression & Governance**
   - stable screenshot matrix for light/dark and representative leaf widths;
   - final cross-view rule audit and gate tightening.

## Permanent UI rules

1. Dashboard Module is framed because it is an independent view.
2. Settings section is not framed by default because it is information hierarchy, not an independent widget.
3. Border, background and radius appear only when they communicate a real boundary.
4. Obsidian host semantics are the source of base colors, typography, focus and density.
5. Feature code owns layout and visualization geometry; shared primitives/components own ordinary control and row appearance.
6. Container width is the primary responsive signal inside Obsidian workspace leaves.
7. High-frequency Settings do not read like documentation.
8. A visual convergence is not complete if each feature still owns a separate implementation of the same ordinary UI pattern.
9. Sibling content uses rhythm before dividers; dividers are structural, not decorative.
10. Independent objects use the shared object-frame contract; ordinary Sections and Rows do not invent local cards.
