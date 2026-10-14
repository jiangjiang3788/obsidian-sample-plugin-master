import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The task tint must remain readable on Android WebView without relying on
// color-mix(), while labels and interaction controls stay fully opaque.
const timeline = readFileSync(new URL('../../src/styles/features/timeline.css', import.meta.url), 'utf8');
const goalAllocation = readFileSync(new URL('../../src/styles/features/timeline-goal-allocation.css', import.meta.url), 'utf8');
function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...timeline.matchAll(new RegExp('^' + escaped + '\\s*\\{([^}]*)\\}', 'gm'))];
  assert.equal(matches.length, 1, `Expected one exact CSS rule for ${selector}`);
  return matches[0][1];
}
const content = rule('.timeline-task-content');
const tint = rule('.timeline-task-content::before');
assert.match(content, /position:\s*relative/);
assert.doesNotMatch(content, /color-mix\(/);
assert.match(tint, /background:\s*var\(--timeline-goal-color,/);
assert.match(tint, /opacity:\s*var\(--timeline-fill-opacity\)/);
assert.match(tint, /pointer-events:\s*none/);
assert.match(rule('.timeline-task-content > *'), /z-index:\s*1/);
for (const [status, opacity] of [['open','0.11'], ['done','0.22']]) {
  assert.match(rule(`.timeline-task-block--${status}`), new RegExp(`--timeline-fill-opacity:\\s*${opacity.replace('.', '\\.')}\\s*;`));
}
assert.match(goalAllocation, /\.timeline-goal-allocation-fill\s*\{[^}]*opacity:\s*0\.50\s*;/s);
assert.doesNotMatch(timeline, /--timeline-fill-strength/);
console.log('PASS: Timeline translucent goal colors have a color-mix-independent fallback.');
