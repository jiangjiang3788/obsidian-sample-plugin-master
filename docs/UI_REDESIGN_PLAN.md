# Think OS UI Redesign Plan

> Current target: Obsidian-native + Compact + Framed + Low-noise
> Current release: 1.0.46
> Progress: 5 / 11 phases complete (Phase 0-4)

## Progress

| Phase | Scope | Status | Release |
|---|---|---|---|
| 0 | Visual baseline / source UI audit | DONE | pre-1.0.44 |
| 1 | Obsidian Host Bridge | DONE | 1.0.44 |
| 2 | Dashboard Module Frame | DONE | 1.0.44 |
| 3 | Toolbar / Actions / Icons | DONE | 1.0.45 |
| 4 | Settings: Data Management -> Theme pilot | DONE | 1.0.46 |
| 5 | Settings system convergence | NEXT | 1.0.47 |
| 6 | List / hierarchy views | TODO | later |
| 7 | Grid / data views | TODO | later |
| 8 | Visualization views | TODO | later |
| 9 | Modal / Quick Input / AI | TODO | later |
| 10 | Visual regression + UI gates | TODO | later |

## Phase contracts

### Phase 0 - baseline
- Inventory all major views and current CSS ownership.
- Keep representative light/dark and narrow/wide screenshots for comparison.

### Phase 1 - host bridge
- Feature CSS consumes Think semantic tokens.
- Think semantic tokens inherit Obsidian colors, typography, radius, focus and control density.
- Accent is state, not a persistent surface color.

### Phase 2 - module frame
- Every dashboard view remains clearly framed.
- Module header uses host surface instead of a persistent accent bar.
- Module shell has one authoritative CSS owner.

### Phase 3 - toolbar / actions / icons
- Time granularity uses one segmented-control primitive.
- Date navigation and layout actions use shared icon buttons.
- Filter triggers use shared buttons.
- Dashboard feature code does not own raw button skins.
- Icon shapes use one Lucide-style SVG language while respecting the existing platform boundary.
- Responsive behavior follows leaf/container width rather than browser viewport alone.

### Phase 4 - Settings Theme pilot
- Redesign only Data Management -> Theme first.
- Remove decorative nested cards while preserving true interaction boundaries.
- Use flat sections, hairline dividers and compact rows instead of card-inside-card grouping.
- Routine explanatory prose is removed from the daily-use surface; persistent helper text is reserved for constraints, side effects, errors and genuinely non-obvious behavior.
- Establish page title, section, field row, search, status and list-row contracts.
- Do not spread to all Settings until the pilot is visually accepted.

### Phase 5 - Settings system
- Apply the accepted Theme pilot language to Goal, Record Type, Metric, General, Layout, AI and View Editors.
- Converge RuleBuilder, CommonFilterPanel and FieldPicker.

### Phase 6 - list / hierarchy views
- Converge Block, Progress and Energy task/list families.
- Standardize row height, indentation, checkbox, metadata, action, hover and selection.

### Phase 7 - grid / data views
- Converge Table, Excel and Heatmap shell behavior.
- Standardize toolbar, header, cell density, border, selection and empty state without forcing identical visualizations.

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
5. Feature code owns layout and visualization geometry; primitives own ordinary control appearance.
6. Container width is the primary responsive signal inside Obsidian workspace leaves.
7. High-frequency Settings do not read like documentation: obvious instructional prose is hidden or removed; only decision-relevant help, errors, warnings and state remain visible.
