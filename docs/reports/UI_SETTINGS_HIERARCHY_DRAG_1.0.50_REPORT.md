# Think OS 1.0.50 - Settings hierarchy and layout view ordering

## Scope

Phase 5 visual hierarchy polish only. Phase 6 is intentionally not started.

## Changes

- View Settings hierarchy is now sibling sections: Base Settings, Filter, Sort, concrete View editor.
- Removed the redundant outer `Table Config`-style heading; the concrete editor owns its own title and subsections.
- Quick filter headers can be suppressed when an enclosing section already provides the semantic heading.
- Advanced filter counts now represent advanced rules instead of all filter rules.
- Layout included-view ordering now uses `@dnd-kit` drag-and-drop with a grip handle.
- Removed per-view previous/next arrow buttons and the equivalent context-menu actions.
- Each included view now exposes: drag handle, title (open settings), remove action, and right-click overflow actions.

## Acceptance focus

1. Filter / Sort / concrete View config should read as peer sections instead of nested headings.
2. Included views should be reorderable by drag with less per-item chrome.
3. No Phase 6 business-view styling is included in this release.
