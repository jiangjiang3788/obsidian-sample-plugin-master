/** Dependency-free regression smoke test for the timeline viewport contract.
 * This is NOT a replacement for Jest, Vite or real iOS/Android Obsidian QA. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const globalModules = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
const ts = require(path.join(globalModules, 'typescript'));
const postcss = require(path.join(globalModules, 'postcss'));
const modified = [
  'src/shared/ui/timeline/TimelineTouchGesture.ts',
  'src/shared/ui/timeline/TimelineAxisPan.ts',
  'src/shared/ui/public.ts',
  'src/features/views/runtime/TimelineView/TimelineDailyView.tsx',
  'src/features/views/runtime/components/timeline/TimelineTaskBlock.tsx',
  'src/features/views/runtime/components/timeline/TimelineTimeAxis.tsx',
  'src/features/views/runtime/components/timeline/DayColumnBody.tsx',
  'test/unit/timelineAxisPan.test.ts',
  'test/unit/timelineTouchGestureMachine.test.ts',
  'test/unit/timelineTaskDragUi.test.tsx',
  'test/unit/timelineResponsiveWidthContract.test.ts',
];
const emitted = new Map();
for (const name of modified) {
  const code = fs.readFileSync(path.join(root, name), 'utf8');
  const result = ts.transpileModule(code, {
    fileName: name,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
      jsxImportSource: 'preact', module: ts.ModuleKind.CommonJS },
  });
  assert.equal((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0,
    `${name}: TypeScript syntax errors`);
  emitted.set(name, result.outputText);
}

const stylesheet = fs.readFileSync(path.join(root, 'src/styles/features/timeline.css'), 'utf8');
postcss.parse(stylesheet, { from: 'timeline.css' });
assert.match(stylesheet, /overscroll-behavior:\s*contain/);
assert.match(stylesheet, /\.timeline-task-resize-handle\s*\{\s*display:\s*none/);
assert.match(stylesheet, /\.timeline-task-block--edit-mode \.timeline-task-resize-handle,[\s\S]*?display:\s*block/);
assert.match(stylesheet, /touch-action:\s*pan-y/);
const timeAxisSource = fs.readFileSync(path.join(root, 'src/features/views/runtime/components/timeline/TimelineTimeAxis.tsx'), 'utf8');
assert.match(timeAxisSource, /anchor\?\.closest<HTMLElement>\('\.timeline-view-wrapper'\)/);
assert.doesNotMatch(timeAxisSource, /anchor\.scrollIntoView\(/);

function load(name) {
  const module = { exports: {} };
  const code = emitted.get(name);
  const localRequire = (requested) => {
    if (requested === './TimelineTouchGesture') return load('src/shared/ui/timeline/TimelineTouchGesture.ts');
    throw new Error(`Unexpected module: ${requested}`);
  };
  vm.runInNewContext(`(function(module, exports, require, setTimeout, clearTimeout, Date, Math, requestAnimationFrame, cancelAnimationFrame){\n${code}\n})`,
    { Math, Date, setTimeout, clearTimeout }, { filename: name })(
    module, module.exports, localRequire, setTimeout, clearTimeout, Date, Math, undefined, undefined,
  );
  return module.exports;
}
const touchLogic = load('src/shared/ui/timeline/TimelineTouchGesture.ts');
const panLogic = load('src/shared/ui/timeline/TimelineAxisPan.ts');
assert.equal(panLogic.resolveTimelinePanAxis(4, 4), null);
assert.equal(panLogic.resolveTimelinePanAxis(20, 18), 'y');
assert.equal(panLogic.resolveTimelinePanAxis(40, 12), 'x');
assert.equal(touchLogic.classifyTimelineTap(null, { clientX: 10, clientY: 30 }, 1000).doubleTap, false);
const tap = touchLogic.classifyTimelineTap(null, { clientX: 10, clientY: 30 }, 1000);
assert.equal(touchLogic.classifyTimelineTap(tap.next, { clientX: 12, clientY: 31 }, 1200).doubleTap, true);
assert.equal(touchLogic.classifyTimelineTap(tap.next, { clientX: 12, clientY: 31 }, 1500).doubleTap, false);

class Surface extends EventTarget {
  constructor() {
    super();
    this.scrollWidth = 1200;
    this.clientWidth = 300;
    this.scrollHeight = 1600;
    this.clientHeight = 400;
    this.scrollLeft = 200;
    this.scrollTop = 140;
    this.ownerDocument = { defaultView: { matchMedia: () => ({ matches: false }) } };
  }
}
function touchList(points) {
  return { length: points.length, item: i => points[i] || null };
}
function touch(surface, type, x, y, count = 1) {
  const point = { identifier: 7, clientX: x, clientY: y };
  const active = type === 'touchend' || type === 'touchcancel' ? [] : count === 2
    ? [point, { identifier: 8, clientX: x + 80, clientY: y }] : [point];
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, { touches: { value: touchList(active) },
    changedTouches: { value: touchList([point]) } });
  surface.dispatchEvent(event);
  return event;
}
function wheel(surface, deltaX, deltaY, modifiers = {}) {
  const event = new Event('wheel', { bubbles: true, cancelable: true });
  Object.assign(event, { deltaX, deltaY, deltaMode: 0, altKey: false, ctrlKey: false,
    metaKey: false, ...modifiers });
  surface.dispatchEvent(event);
  return event;
}
{
  const surface = new Surface();
  const detach = panLogic.attachTimelineAxisLockedPan(surface);
  touch(surface, 'touchstart', 100, 100);
  surface.scrollLeft = 205;
  surface.scrollTop = 170;
  const move = touch(surface, 'touchmove', 80, 83); // near-diagonal -> Y
  assert.equal(move.defaultPrevented, false);
  assert.equal(surface.scrollLeft, 200);
  assert.equal(surface.scrollTop, 170);
  touch(surface, 'touchend', 80, 83);
  surface.scrollLeft = 215; // stray momentum after finger lifts
  surface.dispatchEvent(new Event('scroll'));
  assert.equal(surface.scrollLeft, 200);
  touch(surface, 'touchstart', 100, 100);
  surface.scrollTop = 172;
  const sideways = touch(surface, 'touchmove', 30, 91);
  assert.equal(sideways.defaultPrevented, true);
  assert.equal(surface.scrollLeft, 270);
  // Horizontal pan owns X only; it must not roll Y back to a stale touchstart value.
  assert.equal(surface.scrollTop, 172);
  touch(surface, 'touchend', 30, 91);
  detach();
  touch(surface, 'touchstart', 100, 100);
  touch(surface, 'touchmove', 10, 90);
  assert.equal(surface.scrollLeft, 270, 'detached listener must not move timeline');
}
{
  const surface = new Surface();
  let editing = false;
  const detach = panLogic.attachTimelineAxisLockedPan(surface, () => editing);
  touch(surface, 'touchstart', 100, 100);
  editing = true;
  const consumed = touch(surface, 'touchmove', 10, 90);
  assert.equal(consumed.defaultPrevented, true);
  assert.equal(surface.scrollLeft, 200);
  editing = false;
  touch(surface, 'touchstart', 100, 100);
  touch(surface, 'touchstart', 100, 100, 2); // pinch: single-finger pan cancelled
  touch(surface, 'touchmove', 10, 90, 2);
  assert.equal(surface.scrollLeft, 200);
  detach();
}
{
  const surface = new Surface();
  let detachPinchCalls = 0;
  const detach = panLogic.attachTimelineViewportInteractions(surface, {
    isTimeEditing: () => false,
    requestPinch: () => true,
    bindPinch: () => () => { detachPinchCalls += 1; },
  });
  const vertical = wheel(surface, 2, 40);
  assert.equal(vertical.defaultPrevented, true);
  assert.equal(surface.scrollTop, 180);
  assert.equal(surface.scrollLeft, 200);
  const leakage = wheel(surface, 4, 0);
  assert.equal(leakage.defaultPrevented, true);
  assert.equal(surface.scrollLeft, 200);
  const zoom = wheel(surface, 1, -20, { altKey: true });
  assert.equal(zoom.defaultPrevented, false);
  detach();
  assert.equal(detachPinchCalls, 1);
}
console.log('PASS: TypeScript syntax, CSS parse, shared tap policy, X/Y axis lock, pinch/edit exclusion, wheel axis, cleanup');
console.log('NOTE: Jest, project typecheck, Vite build and real-device input are not exercised by this offline test.');
