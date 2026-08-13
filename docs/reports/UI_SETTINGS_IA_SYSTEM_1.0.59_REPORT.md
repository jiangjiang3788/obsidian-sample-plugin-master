# UI Settings IA System 1.0.59

## Scope

This release changes Settings information architecture across the plugin instead of restyling individual controls.

## System changes

- Replaced the top horizontal primary Settings tabs with a desktop left navigation rail.
- Added a single SettingsNavigation implementation for primary and secondary navigation.
- Kept Data Management categories at the top-left of the content area and removed repeated active-page headings.
- Converted Data Management into explicit list/matrix management patterns.
- Merged Energy defaults into the Record Type management language instead of rendering a separate section above Record Types.
- Simplified Goal management to: create row -> management toolbar -> template matrix.
- Removed the legacy "整理预设" daily action and the permanent Record Type filter-chip strip from the Goal matrix.
- Simplified Theme management to status/search -> create row -> object list.
- Removed duplicate headings from Theme and Metric management.
- Added a Settings IA convergence gate to UI runtime governance.

## Validation target

Settings should read left-to-right without the previous `left primary -> right secondary -> left content` eye movement. Navigation names own the hierarchy; content begins directly with the current task.
