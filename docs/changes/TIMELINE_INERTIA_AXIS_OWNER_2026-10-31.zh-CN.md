# Think OS 1.18.3 - Timeline gesture ownership refactor (2026-10-31)

## Why

The user's iOS schema-2 diagnostic log (13 gestures, 428x926 DPR3) showed that the upper statistics header and the day grid both drive the same `Timeline viewport`. All measured outer containers remained still. There were large X movements **after** touch release during Y inertia: roughly -290px, -92px and +168px in different vertical-dominant gestures. The previous controller held X for only 750ms after `touchend`, and `touchcancel` could discard the guard. These observations establish an in-viewport drift; they do not establish whether WebKit's compositor or a programmatic scroll first initiated that drift.

## Design: one scroll owner, device-appropriate input

- **Y on touch devices:** WebView native scrolling, momentum, accessibility and rubber-band behavior. JavaScript never cancels an ordinary locked-Y `touchmove` or writes `scrollTop` during Y scroll.
- **X on touch devices:** Timeline controller sets `scrollLeft` from locked horizontal swipes and (optionally) runs bounded requestAnimationFrame inertia. Coarse pointer/mobile CSS uses `overflow-x: hidden` to prevent a second native horizontal momentum stream while preserving `scrollLeft` programmability.
- **After Y release:** Guard X until Y scroll changes cease for an idle interval; X scroll attempts also restart the idle measurement. No fixed assumption that all Y momentum ends 750ms after lifting a finger. The guard releases automatically when idle so later deliberate X changes are not blocked.
- **Cancelled touch and pinch:** A WebView `touchcancel` of a Y gesture still protects Y momentum. A second finger interrupts the first touch without leaving a permanent guard; the existing zoom recognizer arbitrates the pinch.
- **Desktop:** Trackpad/wheel burst axis lock and optional Alt+wheel zoom remain unchanged in behavior. Native wheel scrolling continues for pure-axis input. Horizontal scrollbar remains accessible to mouse users.
- **Regions:** The sticky statistics header and time grid continue under one `timeline-view-wrapper` controller. Obsidian page and outside modules are not forcibly disabled.
- **Editing:** Existing mouse direct manipulation, touch long-press, range editing and edge handles have not been modified.

## Changed files

- `src/shared/ui/timeline/TimelineAxisPan.ts` - full touch X/Y ownership lifecycle and inertia idle guard.
- `src/styles/features/timeline.css` - mobile/coarse-pointer native X overflow isolation.
- `test/unit/timelineAxisPan.test.ts` - permanent Jest regression coverage for long Y inertia, touchcancel, second finger.
- `scripts/testing/verify-timeline-inertia-offline.cjs` - dependency-light offline mock event/state-machine verification (uses TypeScript).
- `manifest.json`, `package.json` - release version 1.18.3, test command.

Existing features retained:

- Built-in schema-2 mobile diagnostic with copyable logs.
- Original `think-os` plugin ID, note formats and record persistence code.
- `think-update-plugin` Obsidian command, which uses the existing Vika release installer and rollback path.

## Validated here

- Global TypeScript strict check of the pan and touch state-machine modules: passed.
- 7 event-dispatch/state-machine scenarios (including >1.3 seconds continued Y inertia): passed.
- Chromium mobile emulation layout sanity: `overflow-x:hidden` still allows programmatic `scrollLeft` and native Y `scrollTop`: passed. This is **not** an iOS/Android WebView test.
- Existing integrated diagnostic and update-command offline test: passed.
- TypeScript syntax/transpilation and media-query CSS syntax checks: passed.
- Full Vite bundle and Jest suite: blocked by missing node_modules / unavailable npm registry in the provided source package. Not claimed as passed.

## Release and acceptance before production use

1. In a trusted machine with project dependencies, install via `npm install` or `npm ci` if a lockfile exists.
2. Run `npm run typecheck:src`, `npm run test:timeline-inertia:offline` and `npm run test:timeline:pointer-ui` (plus full project tests when available).
3. Run `npm run build` and confirm `main.js`, `styles.css`, `manifest.json` are produced.
4. In an environment that has the pre-existing Vika token/configuration, run `npm run 发布:维格`; this tool has **not** published a build.
5. Use existing Think OS update settings once and restart Obsidian; thereafter the Obsidian command `更新 Think OS 插件` can invoke that updater.
6. On iPhone and Android, verify Y swipes (fast and slow), diagonal gestures, top statistics header vs grid, X swipes, corner/edge scroll, pinch, block long press and mouse/desktop drag handles. Optional built-in diagnostic: X drift should remain near zero for Y-owned gestures, including after release. If it recurs, retain a new schema-2 log.

This ZIP is SOURCE, not directly installable Obsidian plugin assets. Do not overwrite the active plugin directory with it.
