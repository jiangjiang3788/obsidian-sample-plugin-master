# Think OS CSS Visual Regression Matrix

This matrix is the release checklist for CSS changes. Automated unit tests verify
style ownership and budgets; final screenshots must be captured inside Obsidian,
because browser-only rendering cannot reproduce active community themes or host modal
geometry.

## Required environments

| Theme | Density | Width | Input mode |
|---|---|---:|---|
| Light | default | 360px | touch/coarse |
| Light | default | 560px | mouse/keyboard |
| Light | compact | 840px | mouse/keyboard |
| Dark | default | 360px | touch/coarse |
| Dark | default | 560px | mouse/keyboard |
| Dark | compact | 840px | mouse/keyboard |
| Light + one community theme | default | 1120px | mouse/keyboard |
| Dark + one community theme | default | 1120px | mouse/keyboard |

## Required surfaces

- Settings: General, Data, AI, Input and Layout editor.
- Modal: Quick Input, AI prompt, AI batch confirm, Check-in and name prompt.
- Primitive catalog: buttons, icon buttons, fields, cards, chips, tabs and toolbar.
- Views: Progress, Heatmap, Statistics, Timeline, Excel, Block, Event Timeline and Task Execution.
- Layout modes: List, Grid and Freeform, including drag, resize, locked and collapsed states.
- Empty, loading, error, disabled, selected and focus-visible states.

## Acceptance rules

1. No unreadable text or invisible focus ring.
2. No non-data color changes between layout modes.
3. No unexpected horizontal overflow at 360px; Excel and wide charts may use intentional internal scrolling.
4. Modal footer remains reachable when a mobile keyboard is present.
5. MUI and native controls have matching height, radius and state hierarchy.
6. Community-theme accents are inherited without fixed light-theme surfaces.
7. Freeform movement changes geometry only, never the View skin.

Store approved screenshots outside the source package or in the project review system;
do not commit theme-specific binary screenshots to the plugin release bundle.
