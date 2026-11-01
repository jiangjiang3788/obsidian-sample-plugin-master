# Think OS timeline mobile diagnostic, 2026-10-31

## Purpose
A read-only in-app recorder for iOS Obsidian, Android Obsidian, and desktop. It diagnoses the remaining timeline gesture / nested scroll chain problem without assuming the cause. This is **instrumentation**, not a new gesture fix.

## Integration
- `src/shared/ui/timeline/TimelineMobileDiagnostics.ts`: single ref-counted opt-in recorder for all mounted timeline views. It listens only after Start Recording and removes all event listeners on Stop or unmount. No event cancellation or scroll adjustment.
- `src/features/views/runtime/TimelineView/TimelineDailyView.tsx`: attach/detach diagnostics through the normal Preact effect lifecycle.
- `src/shared/ui/public.ts`: public export of recorder attachment.
- `src/styles/features/timeline-mobile-diagnostic.css`, `src/styles/main.css`: fixed, safe-area-aware floating diagnostic launcher and copyable text area. The interface is outside the timeline scroll containers.
- `scripts/testing/verify-timeline-mobile-diagnostic-offline.cjs`: DOM-mock integration tests for touch, parent scroll, horizontal drift, clipboard, lifecycle, and data minimization.
- `scripts/build/build-standalone-timeline-mobile-diagnostic.cjs`: builds a small self-contained companion Obsidian plugin from the same diagnostic source. Companion plugin is separately installable without rebuilding Think OS.

## Data and privacy contract
- Saves at most 24 gesture reports **in memory only**, resetting when the diagnostic controller unmounts. No network request and no persistent vault writes.
- Each gesture includes type, selected scenario, anonymized hit classes, relative touch delta, peak and end scroll offsets of actual timeline/ancestor scrollports, scroll events, sampled intermediate layer movement, and visual viewport changes.
- No task titles, note body, file paths, record IDs, raw user agent, or text content.
- `multi-layer-scroll` means *two layers moved in the same gesture interval*; it does not prove simultaneous scrolling at the same millisecond. Compare `samples` and reproduce on device to establish ordering.
- `outer-layer-only` means outer scroller moved while timeline viewport did not.
- `vertical-caused-horizontal-drift` means finger motion was Y-dominant but the timeline viewport experienced nontrivial X displacement.
- `timeline-mixed-axes` means both axes moved in the viewport under a non-Y-dominant action.

## Mobile user workflow
1. Open a day/week Think OS timeline.
2. Tap small floating diagnostic button, optionally choose scenario, tap Start Recording, and fold the panel.
3. Reproduce several vertical swipes, horizontal swipes, time-block long presses, pinches, and top/bottom-edge swipes individually.
4. Reopen panel, Stop Recording, Copy Log; paste JSON into ChatGPT. If clipboard is blocked, Select All Log and manually copy from textarea.
5. Clear and disable the diagnostics plugin after troubleshooting.

## Tested
- Strict TypeScript type checking of the standalone diagnostic module.
- TypeScript transpilation for distribution.
- CSS parsed by PostCSS.
- Offline DOM-mock lifecycle, scroll, capture, privacy and clipboard checks passed.
- Self-contained companion main.js passes `node --check`.

## Not tested
- No full Think OS Vite/Jest build: the provided source package lacks node_modules and npm registry DNS cannot be reached in the current environment.
- No real iOS/Android Obsidian gestures have been recorded yet. Device measurements must come from the user's phone.
- The independent companion is ready for installation as an Obsidian community plugin folder, but has not been device-installed or end-to-end visually validated here.

## Compatibility and safety
- No Think OS manifest ID/version changes, no Task/Record data changes.
- If the integrated source is later built and installed, disable/uninstall the companion to prevent duplicate diagnostic panels.
- Existing Think OS backups remain important before replacing production builds. The companion does not replace original Think OS files.
