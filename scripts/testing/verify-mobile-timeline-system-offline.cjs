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
  'src/platform/obsidian/GitHubDevUpdater.ts',
  'src/features/settings/components/DevBuildUpdateControl.tsx',
  'test/unit/timelineTouchGestureMachine.test.ts',
  'test/unit/timelineTaskDragUi.test.tsx',
  'test/unit/platform/githubDevUpdater.test.ts',
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

const sha='f'.repeat(40), commitTime='2026-10-14T03:12:00.000Z', pushTime='2026-10-14T03:14:00.000Z';
const payloads = {
  'main.js': '/* build */' + 'b'.repeat(1700),
  'styles.css': '.think-os { display:block; }' + 's'.repeat(100),
  'manifest.json': JSON.stringify({id:'think-os',version:'1.18.2',main:'main.js',styles:'styles.css'}),
};
let urls=[], headUnavailable=false, failCSS=false;
async function requestUrl({url}) {
  urls.push(url);
  if (url.includes('/commits/main')) return { status: headUnavailable ? 403:200, json: { sha, commit: { committer: { date: commitTime } } } };
  if (url.includes('/events?')) return { status: 200, json: [{type:'PushEvent',created_at:pushTime,payload:{ref:'refs/heads/main',head:sha}}] };
  for (const [file,text] of Object.entries(payloads)) if (url.includes(`/${sha}/${file}?`)) {
    return {status:failCSS && file==='styles.css'? 503:200,text};
  }
  throw Error(`Unexpected URL ${url}`);
}
const updater = evaluate('src/platform/obsidian/GitHubDevUpdater.ts', {
  obsidian: { requestUrl, normalizePath:(x)=>x },
});
const stored=Object.fromEntries(Object.keys(payloads).map(file=>[`.obsidian/plugins/think-os/${file}`,`old ${file}`]));
let failPartial=false, failReadback=false, writeCount=0;
const host={manifest:{id:'think-os'},app:{vault:{configDir:'.obsidian',adapter:{
 exists:async (name)=>name in stored,
 read:async (name)=>stored[name],
 write:async (name,text)=>{writeCount++;stored[name]=(failReadback && name.endsWith('main.js'))?'corrupt':text;
   if(failPartial && name.endsWith('styles.css')){failPartial=false;throw Error('interrupted write');}
 },
 remove:async (name)=>{delete stored[name];},
}}}};
(async()=>{
  const preview=await updater.getGitHubDevBuildInfo('think-os');
  assert.equal(preview.githubPushedAt,pushTime);
  assert.equal(preview.githubCommitAt,commitTime);
  assert.equal(preview.commitSha,sha);
  await updater.pullGitHubDevBuild(host,preview);
  assert.equal(writeCount,3);
  assert(urls.filter(u=>u.includes('raw.githubusercontent.com')).every(u=>u.includes(`/${sha}/`)));
  console.log('PASS pinned GitHub preview, verified push time, and read-back checked download');
  const oldMain=stored['.obsidian/plugins/think-os/main.js'];
  writeCount=0;
  await assert.rejects(updater.pullGitHubDevBuild(host,{...preview,remoteVersion:'9.9.9'}),/预览版本与下载版本不匹配/);
  assert.equal(writeCount,0);
  failCSS=true;
  await assert.rejects(updater.pullGitHubDevBuild(host,preview),/下载 styles.css 失败/);
  assert.equal(writeCount,0);failCSS=false;
  failPartial=true;
  await assert.rejects(updater.pullGitHubDevBuild(host,preview),/已回滚到原版本/);
  assert.equal(stored['.obsidian/plugins/think-os/main.js'],oldMain);
  assert.equal(stored['.obsidian/plugins/think-os/styles.css'],payloads['styles.css']);
  failReadback=true;
  await assert.rejects(updater.pullGitHubDevBuild(host,preview),/写入校验失败/);
  failReadback=false;
  headUnavailable=true;writeCount=0;
  await assert.rejects(updater.pullGitHubDevBuild(host),/无法确保同一版本/);
  assert.equal(writeCount,0);
  console.log('PASS mismatched/partial downloads, partial writes, readback failure & GitHub API outage');
  const js=source('main.js');
  new vm.Script(js,{filename:'main.js'});
  for(const marker of ['class TimelineTouchGesture {','function useTimelineTouchGesture(','function findGitHubRevisionPushTime(','githubPushedAt','for (const minute of TIMELINE_KEY_HOURS.map(']) assert(js.includes(marker),marker);
  assert(!js.includes('_jsx(') && !js.includes('_jsxs('), 'Unbound automatic JSX in offline bundle');
  assert(!fs.existsSync(path.join(root,'main.js.map')));
  const manifest=JSON.parse(source('manifest.json'));
  assert.equal(manifest.version,require(path.join(root,'package.json')).version);
  console.log('PASS install main.js parses, offline runtime markers, manifest sync, no stale map');
})().catch((error)=>{console.error(error);process.exitCode=1;});
