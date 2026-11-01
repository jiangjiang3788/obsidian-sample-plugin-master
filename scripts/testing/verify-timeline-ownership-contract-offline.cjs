/**
 * Source-level governance for the single-owner timeline gesture contract.
 * Runs without project dependencies and without an Obsidian vault.
 * This is NOT a substitute for iOS/Android momentum and scroll chaining QA.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(base, file), 'utf8');
const pan = read('src/shared/ui/timeline/TimelineAxisPan.ts');
const view = read('src/features/views/runtime/TimelineView/TimelineDailyView.tsx');
const zoom = read('src/core/hooks/useTimelineZoom.ts');
const axis = read('src/features/views/runtime/components/timeline/TimelineTimeAxis.tsx');
const css = read('src/styles/features/timeline.css');
const moduleCss = read('src/styles/features/view-shell.modules.css');

// Only one instance owns timeline pan + pinch registration, under one lifecycle.
assert.match(view, /attachTimelineViewportInteractions\(node,/);
assert.match(pan, /attachTimelineAxisLockedPan\(surface,/);
assert.match(pan, /options\.bindPinch\?\.\(surface,/);
assert.match(pan, /detachPinch\?\.\(\)/);
assert.match(pan, /detachPan\(\)/);

// No programmatic Y rollback in horizontal touch pan. Y is native in the
// interior and the controller writes Y only on a verified edge handoff.
assert.doesNotMatch(pan, /surface\.scrollTop\s*=\s*current\.top/);
assert.match(pan, /current\.edgeOwnedY \|\| crossesEdge/);
assert.match(pan, /event\.cancelable && \(current\.edgeOwnedY/);
assert.match(pan, /const stopAtTimelineBoundary = \(event: TouchEvent\) => event\.stopPropagation\(\)/);
assert.match(pan, /surface\.addEventListener\('touchmove', move, \{ capture: true, passive: false \}/);

// Mobile retains the original continuous week; the same scrollport owns
// grid and header. Native Y is encouraged; horizontal JS owns X.
assert.match(css, /\.timeline-view-wrapper\s*\{[^}]*overflow-x:\s*auto;/s);
assert.match(css, /\.timeline-view-wrapper\s*\{[^}]*overflow-y:\s*auto;/s);
assert.match(css, /\.timeline-view-wrapper\s*\{[^}]*overscroll-behavior:\s*contain;/s);
assert.match(css, /\.timeline-view-wrapper\s*\{[^}]*touch-action:\s*pan-y;/s);
assert.match(css, /\.timeline-sticky-header\s*\{[^}]*position:\s*sticky;/s);
assert.match(view, /<div class="timeline-sticky-header">/);
assert.match(view, /<div class="timeline-scrollable-body">/);
assert.match(view, /dayColumns\.map\(/);
assert.doesNotMatch(view, /mobileWeekMode|weekOverview|mobileDayDetail|dateNavigator/);

// The outer module is a generic layout frame; changing it globally would
// damage other modules. It must not gain custom timeline gesture handlers.
assert.match(moduleCss, /\.think-os \.module-content\s*\{/);
assert.doesNotMatch(moduleCss, /touchmove|touchstart/);

// The only explicit non-touch Y writers are an authorized pinch/zoom and an
// intentional current-time double click. No accidental scrollIntoView chain.
assert.match(zoom, /pending\.surface\.scrollTop\s*=/);
assert.match(zoom, /surface\.scrollTop\s*=\s*desiredTop/);
assert.match(axis, /viewport\.scrollTop\s*=/);
assert.doesNotMatch(axis, /\banchor\.scrollIntoView\s*\(/);

// Temporary recorder and floating panel were removed; pan/zoom remain.
assert.doesNotMatch(view, /attachTimelineMobileDiagnostics|timeline-rendered-blocks/);
assert.doesNotMatch(read('src/shared/ui/public.ts'), /TimelineMobileDiagnostics/);
assert.doesNotMatch(read('src/styles/main.css'), /timeline-mobile-diagnostic\.css/);
assert.match(moduleCss, /\.think-os \.think-module--timeline-scroll > \.module-content\s*\{/);
console.log('PASS: timeline is the single X/Y gesture focus surface');
console.log('PASS: header and 7-day grid share the same native-Y + JS-X scrollport');
console.log('PASS: parent JS gesture bubbling contained; no horizontal Y rollback');
console.log('PASS: Y edge fallback explicitly cancelable; unrelated layout unchanged');
console.log('PASS: zoom/current-time Y writers identified; temporary recorder removed');
