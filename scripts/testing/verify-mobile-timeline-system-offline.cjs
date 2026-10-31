'use strict';
/** Runnable without dependencies except the globally available TypeScript tool.
 * Complements (does not replace) Jest, tsc, Vite and real device QA. */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
let ts;
try { ts = require('typescript'); } catch { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript'); }
const root = path.resolve(__dirname, '..', '..');
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const files = [
  'src/core/hooks/useTimelineZoom.ts',
  'src/core/utils/timelineScale.ts',
  'src/shared/ui/timeline/TimelineTouchGesture.ts',
  'src/shared/ui/timeline/useTimelineTouchGesture.ts',
  'src/shared/ui/timeline/TimeRulerGrid.tsx',
  'src/shared/ui/public.ts',
  'src/core/utils/public.ts',
  'src/features/views/runtime/TimelineView/TimelineDailyView.tsx',
  'src/features/views/runtime/components/timeline/DayColumnBody.tsx',
  'src/features/views/runtime/components/timeline/TimelineTaskBlock.tsx',
  'src/features/settings/components/VikaUpdateControl.tsx',
  'test/unit/timelineTouchGestureMachine.test.ts',
  'test/unit/timelineTaskDragUi.test.tsx',
];
function transpile(file) {
  const out = ts.transpileModule(source(file), {
    fileName: file, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX, jsxImportSource: 'preact', isolatedModules: true },
  });
  const errors = (out.diagnostics || []).filter((d)=>d.category===ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `${file}: ${errors.map((d)=>ts.flattenDiagnosticMessageText(d.messageText,'\n')).join('\n')}`);
  return out.outputText;
}
for (const file of files) transpile(file);
console.log(`PASS ${files.length} modified TS/TSX source + tests transpile`);

function evaluate(file, deps={}, additions={}) {
  const mod = { exports: {} };
  vm.runInNewContext(transpile(file), { module: mod, exports: mod.exports,
    require: (dep) => { if (!Object.prototype.hasOwnProperty.call(deps,dep)) throw Error(`Unexpected dependency ${dep}`); return deps[dep]; },
    setTimeout, clearTimeout, console, navigator:{vibrate:()=>{}}, ...additions }, { filename: file });
  return mod.exports;
}

const { buildTimelineScale, timelineKeyHour, TIMELINE_KEY_HOURS } = evaluate('src/core/utils/timelineScale.ts');
assert.equal(TIMELINE_KEY_HOURS.join(','), '3,6,9,12');
for (const densityMode of ['fine','compact']) for (const hourHeight of [5,10,20,30,50,120,200]) {
  const scale = buildTimelineScale({ hourHeight, densityMode, maxHours:24 });
  for (const hour of [3,6,9,12]) {
    const tick=scale.ticks.find((item)=>item.minute===hour*60);
    assert(tick && tick.showInGrid && tick.level==='hour', `Missing ${hour} at ${hourHeight}/${densityMode}`);
    assert.equal(timelineKeyHour(tick.minute), hour);
  }
  assert(scale.ticks.every((tick,i)=>i===0||tick.minute>scale.ticks[i-1].minute));
}
console.log('PASS cross-platform 3/6/9/12h marks, 2 densities x 7 zoom levels');

const pending = new Map(); let tid = 0;
function advance() { for(const [id,fn] of [...pending]) { pending.delete(id); fn(); } }
const { TimelineTouchGesture, TIMELINE_TOUCH_POLICY } = evaluate(
  'src/shared/ui/timeline/TimelineTouchGesture.ts', {},
  { setTimeout: (fn)=>{ pending.set(++tid, fn); return tid; }, clearTimeout: (id)=>pending.delete(id) });
const p = (x,y,identifier=12)=>({identifier,clientX:x,clientY:y});
let arms=0;
const gesture = new TimelineTouchGesture(()=>{ arms++; });
gesture.start(p(20,30),'move');
assert.equal(gesture.move(p(20,60),1),'scroll');advance();assert.equal(arms,0);
assert.equal(gesture.end(p(20,60)),null);
gesture.start(p(20,30),'select');
assert.equal(gesture.move(p(70,30),1),'scroll');advance();assert.equal(arms,0);
gesture.start(p(20,30),'move');
assert.equal(gesture.move(p(22,31),1),'pending');
assert.equal(gesture.end(p(22,31)).kind,'tap');advance();assert.equal(arms,0);
gesture.start(p(20,30),'resize-end');advance();assert.equal(arms,1);
assert.equal(gesture.move(p(20,70),1),'drag');
const result = gesture.end(p(20,70));
assert.equal(result.kind,'drag');assert.equal(result.anchor.mode,'resize-end');
gesture.start(p(20,30),'select');advance();
assert.equal(gesture.end(p(20,30)).kind,'press');
gesture.start(p(20,30),'select');assert.equal(gesture.move(p(20,30),2),'scroll');
advance();assert.equal(arms,2);
gesture.start(p(20,30),'select');gesture.cancel();advance();assert.equal(arms,2);
assert(TIMELINE_TOUCH_POLICY.longPressMs >= 450);
console.log('PASS same long-press controller: scrolling/tap/drag/multitouch/cancel');

const css = source('src/styles/features/timeline.css');
for (const hour of [3,6,9,12]) assert(css.includes(`.think-time-grid__tick--key-${hour}`));
assert(css.includes('body.is-mobile .timeline-view-wrapper'));
assert(css.includes('@supports not (container-type: inline-size)'));
assert(css.includes('-webkit-touch-callout: none'));
assert(css.includes('overflow: auto'));
assert(source('src/app/dashboard/ViewportDeferredView.tsx').includes('eagerMobileTimeline'));
let postcss;
try { postcss = require('postcss'); } catch { postcss = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/postcss'); }
postcss.parse(source('styles.css'));
postcss.parse(css);
assert(source('styles.css').includes(css.trimEnd()));
console.log('PASS CSS parse, Android fallback, native touch scroller, bundled CSS parity');

console.log('PASS timeline source checks; Vika updater tested separately');
