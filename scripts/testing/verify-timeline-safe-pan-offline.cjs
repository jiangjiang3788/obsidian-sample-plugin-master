/** Real event-dispatch regression for the timeline's touch/wheel state machine.
 * Run after npm install: node scripts/testing/verify-timeline-inertia-offline.cjs
 * No Obsidian vault or task data is accessed.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const ts = (() => { try { return require('typescript'); } catch { return require(path.join(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), 'typescript')); } })();
const root = path.resolve(__dirname, '../..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

function runtime() {
  let time = 1000;
  let counter = 0;
  const timers = new Map();
  const frames = new Map();
  const advance = (ms) => {
    const until = time + ms;
    for (;;) {
      let nextKind = null, nextId = null, nextAt = Infinity;
      for (const [id, job] of timers) if (job.at < nextAt) {nextKind='timer'; nextId=id; nextAt=job.at;}
      for (const [id, job] of frames) if (job.at < nextAt) {nextKind='frame'; nextId=id; nextAt=job.at;}
      if (nextAt > until) break;
      time = nextAt;
      if (nextKind === 'timer') { const job=timers.get(nextId); timers.delete(nextId); job.fn(); }
      else { const job=frames.get(nextId); frames.delete(nextId); job.fn(time); }
    }
    time = until;
  };
  const clock = {
    Date: class extends Date { static now() { return time; } },
    setTimeout(fn, delay) { const id = ++counter; timers.set(id, {fn, at:time + Math.max(1, delay)}); return id; },
    clearTimeout(id) {timers.delete(id);},
    requestAnimationFrame(fn) {const id=++counter; frames.set(id,{fn,at:time+16}); return id;},
    cancelAnimationFrame(id) {frames.delete(id);},
    advance,
    pending() {return timers.size+frames.size;},
  };
  function compile(source, file, requireOverride) {
    const output = ts.transpileModule(source, {
      fileName: file,
      compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
      reportDiagnostics: true,
    });
    assert.equal((output.diagnostics || []).filter(d=>d.category === ts.DiagnosticCategory.Error).length, 0);
    const module = {exports:{}};
    vm.runInNewContext(output.outputText,
      { module, exports: module.exports, require: requireOverride,
        Date:clock.Date, setTimeout:clock.setTimeout, clearTimeout:clock.clearTimeout,
        requestAnimationFrame:clock.requestAnimationFrame,
        cancelAnimationFrame:clock.cancelAnimationFrame, Math, Set, Map }, {filename:file});
    return module.exports;
  }
  const touch = compile(read('src/shared/ui/timeline/TimelineTouchGesture.ts'), 'TimelineTouchGesture.ts', () => {throw Error('unexpected dependency');});
  const axis = compile(read('src/shared/ui/timeline/TimelineAxisPan.ts'), 'TimelineAxisPan.ts', name => {
    assert.equal(name, './TimelineTouchGesture'); return touch;
  });
  return {clock, axis};
}

class Surface {
  constructor() {
    this.scrollLeft=200; this.scrollTop=140;
    this.scrollWidth=1200; this.clientWidth=300;
    this.scrollHeight=1600; this.clientHeight=400;
    this.listeners=new Map();
    this.ownerDocument={defaultView:{matchMedia:()=>({matches:false})}};
  }
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type,new Set());
    this.listeners.get(type).add(callback);
  }
  removeEventListener(type, callback) {this.listeners.get(type)?.delete(callback);}
  dispatch(type, options={}) {
    const ev = { type, target:this, cancelable:true, defaultPrevented:false,
      touches:{length:0,item:()=>null}, preventDefault(){this.defaultPrevented=true;},
      stopPropagation(){this.propagationStopped=true;},
      ...options };
    for (const cb of this.listeners.get(type)||[]) cb(ev);
    return ev;
  }
  touch(type, x, y, count=1) {
    const finger={identifier:7,clientX:x,clientY:y};
    const points = type === 'touchend' || type === 'touchcancel' ? [] : count === 2 ? [finger,{identifier:8,clientX:x+40,clientY:y}] : [finger];
    return this.dispatch(type,{touches:{length:points.length,item:index=>points[index]||null}});
  }
  wheel(x,y,mods={}) { return this.dispatch('wheel',{deltaX:x,deltaY:y,deltaMode:0,altKey:false,ctrlKey:false,metaKey:false,...mods}); }
  nativeScroll(x,y) { this.scrollLeft=x; this.scrollTop=y; this.dispatch('scroll'); }
  listenersCount() {return [...this.listeners.values()].reduce((sum,ls)=>sum+ls.size,0);}
}
function test(name, fn) {
  try {fn(); console.log('PASS ' + name);} catch(e) { console.error('FAIL ' + name, e); process.exitCode=1; }
}

test('iPhone regression: 105px drag ends at 105px, no artificial flick beyond release', () => {
  const {axis,clock}=runtime(), surface=new Surface();
  const detach=axis.attachTimelineAxisLockedPan(surface);
  surface.touch('touchstart',280,120);
  clock.advance(35);
  const ev=surface.touch('touchmove',175,103);
  assert.equal(ev.defaultPrevented,true);
  assert.equal(ev.propagationStopped,true,'Obsidian parent swipe should not claim the X gesture');
  assert.equal(surface.scrollLeft,305);
  surface.touch('touchend',175,103);
  clock.advance(1800);
  assert.equal(surface.scrollLeft,305,'no X motion after touch release');
  detach(); assert.equal(clock.pending(),0);
});

test('Sunday stays reachable with the original seven-column geometry; reverse drag does not snap', () => {
  const {axis,clock}=runtime(), surface=new Surface();
  surface.scrollWidth=912; surface.clientWidth=428; surface.scrollLeft=0; // max X = 484 from iPhone log
  const detach=axis.attachTimelineAxisLockedPan(surface);
  for(const pixels of [180,180,124]) {
    surface.touch('touchstart',300,160);
    surface.touch('touchmove',300-pixels,158);
    surface.touch('touchend',300-pixels,158);
    clock.advance(1100);
  }
  assert.equal(surface.scrollLeft,484,'far-right day remains accessible (not skipped)');
  surface.touch('touchstart',100,160);
  surface.touch('touchmove',150,158);
  surface.touch('touchend',150,158);
  clock.advance(1100);
  assert.equal(surface.scrollLeft,434,'can return 50px without jumping back to start');
  detach();
});

test('vertical intent has priority and Y momentum never causes an X drift', () => {
  const {axis,clock}=runtime(), surface=new Surface();
  const detach=axis.attachTimelineAxisLockedPan(surface);
  surface.touch('touchstart',100,300);
  clock.advance(30);
  const ev=surface.touch('touchmove',135,180);
  assert.equal(ev.defaultPrevented,false);
  assert.equal(ev.propagationStopped,true,'the timeline owns the gesture; stopping JS bubbling does not stop native Y');
  surface.nativeScroll(200,170);
  surface.touch('touchend',135,180);
  for(let i=0;i<20;i++) {
    clock.advance(90);
    surface.nativeScroll(200 + (i % 4 + 1) * 18, 170+i*13);
    assert.equal(surface.scrollLeft,200, 'late horizontal leak must not persist');
  }
  clock.advance(450);
  surface.nativeScroll(235,430);
  assert.equal(surface.scrollLeft,235,'lock clears when Y inertia becomes idle');
  detach(); assert.equal(clock.pending(),0);
});

test('horizontal owner never writes Y after the browser has advanced it', () => {
  const {axis}=runtime(), surface=new Surface();
  const detach=axis.attachTimelineAxisLockedPan(surface);
  surface.touch('touchstart',260,200);
  surface.scrollTop=162; // prior native Y momentum or another authorized owner
  const move=surface.touch('touchmove',150,196);
  assert.equal(move.defaultPrevented,true);
  assert.equal(surface.scrollLeft,310);
  assert.equal(surface.scrollTop,162,'X pan must not rewind Y to old touchstart');
  surface.touch('touchend',150,196);
  detach();
});

test('native Y at the boundary cannot delegate an outward cancelable move to the dashboard', () => {
  const {axis}=runtime(), surface=new Surface();
  surface.scrollTop=1200; // 1600 - 400 = bottom
  const detach=axis.attachTimelineAxisLockedPan(surface);
  surface.touch('touchstart',110,210);
  const outward=surface.touch('touchmove',120,125);
  assert.equal(outward.defaultPrevented,true,'stop browser Y chain only at outward edge');
  assert.equal(surface.scrollTop,1200);
  surface.touch('touchend',120,125);
  surface.touch('touchstart',110,210);
  const inward=surface.touch('touchmove',120,295);
  assert.equal(inward.defaultPrevented,false,'scrolling back into the time grid stays native');
  surface.touch('touchend',120,295);
  detach();
});

test('one touch crossing the last 25px of the grid is bounded without handing Y to the dashboard', () => {
  const {axis}=runtime(), surface=new Surface();
  surface.scrollTop=1175; // max 1200: 25px until the nested Y limit
  const detach=axis.attachTimelineAxisLockedPan(surface);
  surface.touch('touchstart',100,220);
  const crossing=surface.touch('touchmove',100,120); // 100px downward scroll attempt
  assert.equal(crossing.defaultPrevented,true);
  assert.equal(surface.scrollTop,1200,'the timeline finishes its remaining 25px');
  const back=surface.touch('touchmove',100,170); // reverse 50px inward
  assert.equal(back.defaultPrevented,true,'edge-owner must finish one gesture');
  assert.equal(surface.scrollTop,1150,'edge owner permits reversing inward');
  surface.touch('touchend',100,170);
  detach();
});

test('critical 484px rebound regression: new X gesture starts from live scrollLeft, not old Y guard', () => {
  const {axis,clock}=runtime(), surface=new Surface();
  surface.scrollWidth=912; surface.clientWidth=428;
  surface.scrollLeft=440;
  const detach=axis.attachTimelineAxisLockedPan(surface);
  surface.touch('touchstart',240,200);
  surface.touch('touchmove',250,140); // Y locks 440
  surface.touch('touchend',250,140);
  clock.advance(60);
  // Simulate a legitimate externally controlled offset while Y guard is still armed.
  // Starting a fresh touch must stop the old guard rather than snap to its anchor.
  surface.scrollLeft=390;
  surface.touch('touchstart',250,210);
  surface.touch('touchmove',210,210);
  assert.equal(surface.scrollLeft,430, 'X begins at the current 390, not old 440');
  surface.touch('touchend',210,210);
  clock.advance(1100);
  assert.equal(surface.scrollLeft,430);
  detach();
});

test('no false X claim on diagonal/slight drags; deliberate horizontal still works', () => {
  const {axis}=runtime(), surface=new Surface();
  const detach=axis.attachTimelineAxisLockedPan(surface);
  assert.equal(axis.resolveTimelinePanAxis(12,5),null,'small movement stays undecided');
  assert.equal(axis.resolveTimelinePanAxis(50,40),'y','diagonal belongs to Y');
  assert.equal(axis.resolveTimelinePanAxis(90,17),'x','deliberate X is available');
  surface.touch('touchstart',230,230);
  const almostX=surface.touch('touchmove',180,190);
  assert.equal(almostX.defaultPrevented,false);
  assert.equal(surface.scrollLeft,200);
  surface.touch('touchend',180,190);
  surface.touch('touchstart',230,230);
  const decisiveX=surface.touch('touchmove',140,215);
  assert.equal(decisiveX.defaultPrevented,true);
  assert.equal(surface.scrollLeft,290);
  surface.touch('touchend',140,215);
  detach();
});

test('editing, pinch and native noncancelable Y preempt horizontal pan', () => {
  const {axis,clock}=runtime(), surface=new Surface();
  let editing=false;
  const detach=axis.attachTimelineAxisLockedPan(surface,()=>editing);
  surface.touch('touchstart',100,100);
  editing=true;
  assert.equal(surface.touch('touchmove',20,100).defaultPrevented,true);
  assert.equal(surface.scrollLeft,200);
  editing=false;
  surface.touch('touchstart',100,100);
  surface.touch('touchstart',100,100,2);
  assert.equal(surface.touch('touchmove',20,100,2).defaultPrevented,false);
  assert.equal(surface.scrollLeft,200);
  surface.touch('touchstart',100,100);
  clock.advance(15);
  const noncancelable=surface.dispatch('touchmove',{
    cancelable:false,
    touches:{length:1,item:()=>({identifier:7,clientX:20,clientY:90})},
  });
  assert.equal(noncancelable.defaultPrevented,false);
  assert.equal(surface.scrollLeft,200);
  detach();
});

test('desktop wheel burst lock, zoom, and teardown remain unchanged', () => {
  const {axis,clock}=runtime(), surface=new Surface();
  const detach=axis.attachTimelineAxisLockedPan(surface);
  assert.equal(surface.wheel(2,40).defaultPrevented,true);
  assert.equal(surface.scrollTop,180);
  assert.equal(surface.wheel(12,0).defaultPrevented,true);
  assert.equal(surface.scrollLeft,200);
  assert.equal(surface.wheel(2,-40,{altKey:true}).defaultPrevented,false);
  clock.advance(151);
  assert.equal(surface.wheel(50,2).defaultPrevented,true);
  assert.equal(surface.scrollLeft,250);
  detach(); assert.equal(surface.listenersCount(),0); assert.equal(clock.pending(),0);
});

test('CSS restores baseline X auto and unchanged week/header geometry, with no day-mode UI', () => {
  const css=read('src/styles/features/timeline.css');
  assert.match(css,/\.timeline-view-wrapper\s*\{[^}]*overflow-x:\s*auto/s);
  assert.doesNotMatch(css,/body\.is-mobile\s+\.timeline-view-wrapper\s*\{[^}]*overflow-x:\s*hidden/s);
  assert.match(css,/\.timeline-sticky-header\s*\{[^}]*position:\s*sticky/s);
  assert.match(css,/--timeline-day-width:\s*150px/);
  const view=read('src/features/views/runtime/TimelineView/TimelineDailyView.tsx');
  assert.match(view,/dayColumns\.map\(/);
  assert.doesNotMatch(view,/mobileWeekMode|weekOverview|mobileDayDetail|dateNavigator/);
  const model=read('src/features/views/runtime/TimelineView/TimelineDailyViewModel.ts');
  assert.match(model,/dailyViewData\.dateRangeDays\.map\(/);
});
