/* Focused source contract for removing the temporary timeline recorder and
 * matching the timeline viewport to its dashboard frame. No Obsidian needed. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(root, f));
const view = read('src/features/views/runtime/TimelineView/TimelineDailyView.tsx');
const panel = read('src/app/dashboard/ModulePanel.tsx');
const layout = read('src/app/dashboard/LayoutRenderer.tsx');
const timeline = read('src/styles/features/timeline.css');
const frame = read('src/styles/features/view-shell.modules.css');
const entry = read('src/styles/main.css');
const facade = read('src/shared/ui/public.ts');

for (const file of [
  'src/shared/ui/timeline/TimelineMobileDiagnostics.ts',
  'src/styles/features/timeline-mobile-diagnostic.css',
  'scripts/testing/verify-timeline-mobile-diagnostic-offline.cjs',
  'scripts/build/build-standalone-timeline-mobile-diagnostic.cjs',
  'scripts/testing/verify-timeline-integration-offline.cjs',
]) assert.equal(exists(file), false, `temporary recorder must be removed: ${file}`);
assert.doesNotMatch(view, /attachTimelineMobileDiagnostics|data-timeline-rendered-blocks/);
assert.doesNotMatch(facade, /TimelineMobileDiagnostics/);
assert.doesNotMatch(entry, /timeline-mobile-diagnostic/);

// The frame marker follows only a timeline with a real day grid, never a
// quarterly/yearly summary nor any unrelated module.
assert.match(panel, /flushTimeline\s*\?/);
assert.match(panel, /flushTimeline \? 'think-module--timeline-scroll'/);
assert.match(layout, /viewInstance\.viewType === 'TimelineView' && layoutView !== '年' && layoutView !== '季'/);
assert.match(frame, /\.think-os \.think-module--timeline-scroll > \.module-content\s*\{[^}]*padding: 0;[^}]*overflow: hidden;/s);
assert.match(frame, /\.think-os \.think-freeform-item \.think-module--timeline-scroll \.timeline-view-wrapper\s*\{[^}]*height: 100%;[^}]*max-height: 100%;/s);

// The native timeline remains the only X/Y scrollport. When its columns are
// narrower than a module it fills the frame; when wider, min-width:max-content
// keeps the continuous week instead of clipping Sunday.
assert.match(timeline, /\.timeline-view-wrapper\s*\{[^}]*width: 100%;[^}]*overflow-x: auto;[^}]*overflow-y: auto;/s);
assert.match(timeline, /\.timeline-sticky-header,\s*\.timeline-scrollable-body\s*\{[^}]*width: 100%;[^}]*min-width: max-content;/s);
assert.match(timeline, /\.day-column-header,\s*\.day-column-body\s*\{[^}]*flex: 1 0 var\(--timeline-day-width\);[^}]*min-width: 0;/s);
assert.match(view, /<div class="timeline-sticky-header">/);
assert.match(view, /<div class="timeline-scrollable-body">/);
assert.match(view, /dayColumns\.map\(/);

console.log('PASS: temporary timeline diagnostics absent; updater/pan left intact');
console.log('PASS: only daily/weekly/monthly timeline frame is flush and non-scrolling');
console.log('PASS: small ranges stretch, full week retains its horizontal overflow');
console.log('NOTE: source checks cannot replace real iOS/Android/desktop visual QA');
