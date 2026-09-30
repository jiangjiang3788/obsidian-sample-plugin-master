#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createLoader } = require('./source-loader.cjs');
const root = path.resolve(process.argv[2] || process.cwd());
const out = process.argv[3] || path.join(root, 'reports/testing/restart-timeline/regression.json');
const noopDecorator = () => () => {};
const loader = createLoader(root, { tsyringe: { singleton: noopDecorator, inject: noopDecorator },
 immer: { produce: () => { throw new Error('Offline harness does not replace or test Immer. Run the Jest repository tests.'); } } });
const { DurableJsonStore, previousJsonPath } = loader.load('@/core/storage/DurableJsonStore');
const { DurableSnapshot } = loader.load('@/core/storage/DurableSnapshot');
const { buildTimelineScale, TIMELINE_TICK_STYLE } = loader.load('@/core/utils/timelineScale');
const { buildRecordDraftTimeline } = loader.load('@/core/recordInput/RecordDraftTimeline');
const { toCurrentThinkSettings } = loader.load('@/core/settings/currentSettingsSchema');
const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function fakeFiles(initial = {}) {
 const map = new Map(Object.entries(initial)); const writes = []; const removed = [];
 const files = {
  readFile: async (p) => map.has(p) ? map.get(p) : null,
  writeFile: async (p, text) => { writes.push({ path: p, text }); map.set(p, text); },
  deleteFile: async (p) => { removed.push(p); map.delete(p); },
 };
 return { files, map, writes, removed };
}
const KEY = 'Think/data.json';
const createStore = (h) => new DurableJsonStore(h.files, new Set([KEY]));
const initialSettings = { groups: [], viewInstances: [], layouts: [], goalSettings: { goals: [{ path: '测试', status: 'active' }], goalTemplates: [] } };
const draft = (formData, extra = {}) => ({ id: 'r1', recordTypeId: 'core.task', formData, saved: false, skipped: false, ...extra });

test('缺失文件返回 null，读取不生成默认文件', async () => {
 const h=fakeFiles(); assert.equal(await createStore(h).readJSON(KEY), null); assert.equal(h.writes.length,0);
});
for(const raw of ['{"goals":', '', 'null', '[', '\u0000']) test(`损坏JSON不得降级为空并覆盖（${JSON.stringify(raw)}）`,async()=>{
 const h=fakeFiles({[KEY]:raw});const store=createStore(h);
 await assert.rejects(store.readJSON(KEY),/invalid_json/);
 await assert.rejects(store.writeJSON(KEY,initialSettings),/invalid_json/);
 assert.equal(h.map.get(KEY),raw);assert.equal(h.writes.length,0);
});
test('UTF-8 BOM 可读取，不修改原件', async()=>{const h=fakeFiles({[KEY]:'\uFEFF{"x":1}'});assert.deepEqual(await createStore(h).readJSON(KEY),{x:1});assert.equal(h.writes.length,0);});
test('读取权限/IO失败向上传播',async()=>{const h=fakeFiles();h.files.readFile=async()=>{throw new Error('EACCES')};await assert.rejects(createStore(h).readJSON(KEY),/EACCES/);assert.equal(h.writes.length,0);});
test('主文件缺失但有上次副本时不初始化空库',async()=>{const h=fakeFiles({[previousJsonPath(KEY)]:'{"old":true}'});await assert.rejects(createStore(h).readJSON(KEY),/recovery_required/);assert.equal(h.writes.length,0);});
test('未完成写入日志与主文件不同，阻止静默择一',async()=>{const h=fakeFiles({[KEY]:'{"v":1}',[KEY+'.pending']:'{"v":2}'});await assert.rejects(createStore(h).readJSON(KEY),/recovery_required/);assert.equal(h.writes.length,0);});
test('日志和主文件相同，确认主文件可读',async()=>{const h=fakeFiles({[KEY]:'{"v":2}',[KEY+'.pending']:'{"v":2}'});assert.deepEqual(await createStore(h).readJSON(KEY),{v:2});});
test('成功写入保留上个原始版本，回读一致且清理日志',async()=>{const old='{"v":1}';const h=fakeFiles({[KEY]:old});const s=createStore(h);await s.readJSON(KEY);await s.writeJSON(KEY,{v:2});assert.equal(h.map.get(previousJsonPath(KEY)),old);assert.deepEqual(JSON.parse(h.map.get(KEY)),{v:2});assert.equal(h.map.has(KEY+'.pending'),false);});
test('真正写入前冻结调用者值',async()=>{const h=fakeFiles();const s=createStore(h);const obj={v:1};const p=s.writeJSON(KEY,obj);obj.v=99;await p;assert.equal(JSON.parse(h.map.get(KEY)).v,1);});
test('同路径三次并发写入按请求顺序完成',async()=>{const h=fakeFiles();const base=h.files.writeFile;h.files.writeFile=async(p,t)=>{if(p===KEY&&JSON.parse(t).v===1)await pause(8);await base(p,t)};const s=createStore(h);await Promise.all([1,2,3].map(v=>s.writeJSON(KEY,{v})));assert.equal(JSON.parse(h.map.get(KEY)).v,3);assert.deepEqual(h.writes.filter(w=>w.path===KEY).map(w=>JSON.parse(w.text).v),[1,2,3]);});
test('主文件写入中断保留原始副本和待写入版本，重启显式报错',async()=>{const h=fakeFiles({[KEY]:'{"v":1}'});const base=h.files.writeFile;h.files.writeFile=async(p,t)=>{if(p===KEY){h.map.set(p,'{"v":');throw new Error('ENOSPC')}return base(p,t)};const s=createStore(h);await s.readJSON(KEY);await assert.rejects(s.writeJSON(KEY,{v:2}),/ENOSPC/);assert.equal(h.map.get(previousJsonPath(KEY)),'{"v":1}');assert.equal(JSON.parse(h.map.get(KEY+'.pending')).v,2);await assert.rejects(createStore(h).readJSON(KEY),/recovery_required/);});
test('副本写入失败不会触碰主文件',async()=>{const h=fakeFiles({[KEY]:'{"v":1}'});h.files.writeFile=async()=>{throw new Error('backup_denied')};await assert.rejects(createStore(h).writeJSON(KEY,{v:2}),/backup_denied/);assert.equal(h.map.get(KEY),'{"v":1}');});
test('底层虚假成功但回读不同，不返回保存成功',async()=>{const h=fakeFiles();const base=h.files.writeFile;h.files.writeFile=async(p,t)=>{if(p!==KEY)await base(p,t)};await assert.rejects(createStore(h).writeJSON(KEY,{v:2}),/verify_failed/);});
test('日志删除失败不把已提交写入报成失败',async()=>{const h=fakeFiles();h.files.deleteFile=async()=>{throw new Error('busy')};await createStore(h).writeJSON(KEY,{v:2});assert.deepEqual(await createStore(h).readJSON(KEY),{v:2});});
test('外部同步改变主文件，旧内存不能覆盖',async()=>{const h=fakeFiles({[KEY]:'{"v":1}'});const s=createStore(h);await s.readJSON(KEY);h.map.set(KEY,'{"v":9}');await assert.rejects(s.writeJSON(KEY,{v:2}),/external_change/);assert.equal(h.map.get(KEY),'{"v":9}');});
test('读取缺失后同步来了文件，不能用默认值覆盖',async()=>{const h=fakeFiles();const s=createStore(h);await s.readJSON(KEY);h.map.set(KEY,'{"v":9}');await assert.rejects(s.writeJSON(KEY,{v:0}),/external_change/);});
test('不同文件的写入不共用阻塞队列',async()=>{const h=fakeFiles();let release;const latch=new Promise(r=>release=r);const base=h.files.writeFile;h.files.writeFile=async(p,t)=>{if(p==='slow')await latch;return base(p,t)};const s=createStore(h);const slow=s.writeJSON('slow',{v:1});await s.writeJSON('fast',{v:2});assert.equal(JSON.parse(h.map.get('fast')).v,2);release();await slow;});
for(const raw of [[],true,{}, {groups:[]} ,{goalSettings:{goals:{},goalTemplates:[]}}]) test('设置结构拒绝静默转空 '+JSON.stringify(raw),()=>assert.throws(()=>toCurrentThinkSettings(raw),/settings_/));
test('当前设置正常恢复目标，真正缺失可在内存使用默认值',()=>{assert.equal(toCurrentThinkSettings(initialSettings).goalSettings.goals.length,1);assert.equal(toCurrentThinkSettings(null).goalSettings.goals.length,0);});
test('实际 SettingsRepository 缺失加载不写盘',async()=>{const {SettingsRepository}=loader.load('@/core/services/SettingsRepository');let writes=0;const repo=new SettingsRepository({load:async()=>null,save:async()=>{writes++}});await repo.load();assert.equal(writes,0);});
test('实际 SettingsRepository 保存失败保持原快照',async()=>{const {SettingsRepository}=loader.load('@/core/services/SettingsRepository');const repo=new SettingsRepository({load:async()=>initialSettings,save:async()=>{throw new Error('disk_failed')}});await repo.load();const before=repo.getSnapshot();await assert.rejects(repo.save({...before,floatingTimerEnabled:!before.floatingTimerEnabled}),/disk_failed/);assert.equal(repo.getSnapshot(),before);});
test('多方同时初始化只读取一次',async()=>{let loads=0;const s=new DurableSnapshot({load:async()=>{loads++;await pause(2);return{n:0}},save:async()=>{}});await Promise.all([s.load(),s.load(),s.load()]);assert.equal(loads,1);});
test('初始化失败允许显式重试，不缓存空状态',async()=>{let loads=0;const s=new DurableSnapshot({load:async()=>{if(++loads===1)throw new Error('transient');return{n:1}},save:async()=>{}});await assert.rejects(s.load(),/transient/);assert.throws(()=>s.get());assert.equal((await s.load()).n,1);});
test('未完成加载禁止设置更新',async()=>{let saves=0;const s=new DurableSnapshot({load:async()=>({n:1}),save:async()=>{saves++}});await assert.rejects(s.update(v=>({n:v.n+1})));assert.equal(saves,0);});
test('十次并发变更基于最近已提交值累积',async()=>{let disk;const s=new DurableSnapshot({load:async()=>({n:0}),save:async(v)=>{await pause(1);disk=v}});await s.load();await Promise.all(Array.from({length:10},()=>s.update(v=>({n:v.n+1}))));assert.equal(s.get().n,10);assert.equal(disk.n,10);});
test('写入未结束不发布新内存，失败不通知成功',async()=>{let release;let commits=0;const s=new DurableSnapshot({load:async()=>({n:0}),save:async()=>{await new Promise(r=>release=r);throw new Error('save_failed')},committed:()=>commits++});await s.load();const pending=s.update(()=>({n:1}));await pause(1);assert.equal(s.get().n,0);release();await assert.rejects(pending,/save_failed/);assert.equal(s.get().n,0);assert.equal(commits,1);});
test('失败不污染后续队列，后续仍可从已提交值继续',async()=>{let saves=0;const s=new DurableSnapshot({load:async()=>({n:0}),save:async()=>{if(++saves===1)throw new Error('fail')}});await s.load();await assert.rejects(s.update(()=>({n:7})));await s.update(v=>({n:v.n+1}));assert.equal(s.get().n,1);});
test('陈旧整份设置不能覆盖排队的新变更',async()=>{const s=new DurableSnapshot({load:async()=>({n:0}),save:async()=>{}});await s.load();const first=s.update(()=>({n:1}));const stale=s.replace({n:2});await first;await assert.rejects(stale,/stale_snapshot/);assert.equal(s.get().n,1);});
test('观察者失败不能让已提交保存冒充失败',async()=>{const s=new DurableSnapshot({load:async()=>({n:0}),save:async()=>{},committed:()=>{throw new Error('observer')}});await s.load();await s.update(()=>({n:1}));assert.equal(s.get().n,1);});

for (const [height, fine, coarse] of [[10,60,120],[20,30,60],[40,15,30],[60,15,15],[120,5,15],[144,5,5],[200,5,5]]) test(`每小时${height}px的电脑/窄屏刻度选择`,()=>{assert.equal(buildTimelineScale({hourHeight:height}).tickStepMinutes,fine);assert.equal(buildTimelineScale({hourHeight:height,coarsePointer:true}).tickStepMinutes,coarse);});
for(const coarsePointer of [false,true])test(`刻度边界性质矩阵：${coarsePointer?'触屏/窄屏':'精细指针'}`,()=>{
 for(const hourHeight of [1,10,15.9,16,20,31.9,32,40,47.9,48,60,72,95.9,96,120,143.9,144,200,400])for(const maxHours of [0,1,6,23.5,24]){
  const s=buildTimelineScale({hourHeight,maxHours,coarsePointer});const seen=new Set();let prev=-Infinity,lastLabel=-Infinity;
  for(const tick of s.ticks){assert(!seen.has(tick.minute));seen.add(tick.minute);assert(tick.offset>=0&&tick.offset<=s.height+1e-7);assert(tick.offset-prev>=s.minimumGap-1e-7);prev=tick.offset;if(tick.label){assert(tick.offset-lastLabel>=(coarsePointer?36:28)-1e-7);lastLabel=tick.offset;}}
 }
});
test('五分钟、十五分钟、三十分钟与整点互斥且权重递增',()=>{const s=buildTimelineScale({hourHeight:200,maxHours:1});for(const[m,l]of[[0,'hour'],[5,'five'],[15,'quarter'],[30,'half'],[45,'quarter'],[60,'hour']])assert.equal(s.ticks.find(t=>t.minute===m).level,l);assert(TIMELINE_TICK_STYLE.quarter.width>TIMELINE_TICK_STYLE.five.width);assert(TIMELINE_TICK_STYLE.half.opacity>TIMELINE_TICK_STYLE.quarter.opacity);assert(TIMELINE_TICK_STYLE.quarter.opacity>TIMELINE_TICK_STYLE.five.opacity*2);});
test('缩放只改变绘图位置，不四舍五入原始时间',()=>{const low=buildTimelineScale({hourHeight:20,startMinute:483,endMinute:541});const high=buildTimelineScale({hourHeight:200,startMinute:483,endMinute:541});assert.equal(low.height,(541-483)*20/60);assert.equal(high.height,(541-483)*200/60);});
test('非整点起始的刻度仍锚定真实时钟',()=>{const s=buildTimelineScale({hourHeight:120,startMinute:487,endMinute:560});assert.equal(s.ticks[0].minute,490);assert.equal(s.ticks[0].offset,6);});
test('完整自然日保留24:00边界，没有第25小时',()=>{const s=buildTimelineScale({hourHeight:60,maxHours:25});assert.equal(s.height,1440);assert.equal(s.ticks.at(-1).minute,1440);});

test('已完成任务实际区间和保存状态分别显示',()=>{const model=buildRecordDraftTimeline([draft({内容:'周报',状态:'已完成',startAt:'2026-09-30T09:00',endAt:'2026-09-30T10:00'})]);const e=model.days[0].entries[0];assert.equal(e.status,'已完成');assert.equal(e.saveState,'待保存');assert.equal(e.kind,'actual');assert.equal(e.startMinute,540);assert.equal(e.endMinute,600);});
test('未完成区间不被预览改成完成，输入对象保持不变',()=>{const record=draft({内容:'写代码',status:'open',startAt:'2026-09-30T09:00',endAt:'2026-09-30T10:00'});const raw=JSON.stringify(record);const e=buildRecordDraftTimeline([record]).days[0].entries[0];assert.equal(e.status,'未完成');assert.equal(e.kind,'record');assert.equal(JSON.stringify(record),raw);});
test('表单修改直接进入预览，不回退AI原始值',()=>{const record=draft({内容:'修改后',startAt:'2026-09-30T11:00',endAt:'2026-09-30T12:00'},{cmd:{fieldValues:{内容:'旧内容',startAt:'2026-09-30T09:00'}}});const e=buildRecordDraftTimeline([record]).days[0].entries[0];assert.equal(e.title,'修改后');assert.equal(e.startMinute,660);});
test('只有时长的记录进入未定位区，不编造今天时间',()=>{const m=buildRecordDraftTimeline([draft({内容:'散步',时长:30})]);assert.equal(m.days.length,0);assert.equal(m.unplaced.length,1);});
test('没有日期的钟点不放到今天',()=>{assert.equal(buildRecordDraftTimeline([draft({开始时间:'09:00',结束时间:'10:00'})]).unplaced.length,1);});
test('明确日期加钟点可以预览',()=>{assert.equal(buildRecordDraftTimeline([draft({日期:'2026-09-30',开始时间:'09:00',结束时间:'10:00'})]).days[0].entries[0].endMinute,600);});
test('单个计划时刻是点，不伪造一小时时长',()=>{const e=buildRecordDraftTimeline([draft({scheduledAt:'2026-09-30T09:00',预计时长:60})]).days[0].entries[0];assert.equal(e.kind,'plan');assert.equal(e.startMinute,e.endMinute);});
test('结束早于开始进入待核对，不自动猜跨夜',()=>{const m=buildRecordDraftTimeline([draft({startAt:'2026-09-30T23:00',endAt:'2026-09-30T01:00'})]);assert.equal(m.days.length,0);assert.equal(m.unplaced.length,1);});
test('显式跨午夜拆分显示，仍引用同一草稿ID',()=>{const m=buildRecordDraftTimeline([draft({startAt:'2026-09-30T23:30',endAt:'2026-10-01T00:30'})]);assert.equal(m.days.length,2);assert.equal(m.days[0].entries[0].endMinute,1440);assert.equal(m.days[1].entries[0].startMinute,0);assert.equal(m.days[0].entries[0].id,m.days[1].entries[0].id);});
test('结束恰好午夜不产生次日零长重复块',()=>{const m=buildRecordDraftTimeline([draft({startAt:'2026-09-30T23:00',endAt:'2026-10-01T00:00'})]);assert.equal(m.days.length,1);});
test('非法日期不靠Date自动滚动改成下一月',()=>{assert.equal(buildRecordDraftTimeline([draft({startAt:'2026-02-30T09:00'})]).unplaced.length,1);});
test('极长区间不展开海量DOM，也不丢失待核对记录',()=>{assert.equal(buildRecordDraftTimeline([draft({startAt:'2026-01-01T09:00',endAt:'2026-12-01T10:00'})]).unplaced.length,1);});
test('重叠区间分泳道，毗邻区间可复用泳道',()=>{const m=buildRecordDraftTimeline([
 draft({startAt:'2026-09-30T09:00',endAt:'2026-09-30T10:00'},{id:'a'}),
 draft({startAt:'2026-09-30T09:30',endAt:'2026-09-30T10:30'},{id:'b'}),
 draft({startAt:'2026-09-30T10:00',endAt:'2026-09-30T11:00'},{id:'c'})]);const e=m.days[0].entries;assert.notEqual(e[0].lane,e[1].lane);assert.equal(e[0].lane,e[2].lane);});
test('按时间排序后保留原表单索引',()=>{const m=buildRecordDraftTimeline([draft({startAt:'2026-09-30T12:00'},{id:'later'}),draft({startAt:'2026-09-30T08:00'},{id:'early'})]);assert.equal(m.days[0].entries[0].sourceIndex,1);});
test('跳过/已保存是提交状态，不冒充任务完成状态',()=>{const m=buildRecordDraftTimeline([draft({status:'open',startAt:'2026-09-30T09:00'},{saved:true})]);assert.equal(m.days[0].entries[0].saveState,'已保存');assert.equal(m.days[0].entries[0].status,'未完成');});

const {assertSettingsLocationSafe}=loader.load('@/platform/obsidian/settingsLocationGuard');
test('只在旧目录发现设置时明确阻止空配置初始化',async()=>{
 const app={vault:{adapter:{exists:async(p)=>p==='.obsidian/plugins/think-os/data.json'}}};
 await assert.rejects(assertSettingsLocationSafe(app,'.obsidian/plugins/think-os'),/settings_location_conflict/);
});
test('自定义配置目录被检查，不猜测默认目录',async()=>{
 const seen=[];const app={vault:{adapter:{exists:async(p)=>{seen.push(p);return p==='.custom/plugins/think-os/data.json'}}}};
 await assert.rejects(assertSettingsLocationSafe(app,'.custom/plugins/think-os'),/settings_location_conflict/);
 assert(seen.includes('.custom/plugins/think-os/data.json'));
});
test('主配置存在时不把历史目录当成新的来源',async()=>{
 const seen=[];await assertSettingsLocationSafe({vault:{adapter:{exists:async(p)=>{seen.push(p);return true}}}},'.obsidian/plugins/think-os');
 assert.deepEqual(seen,['Think/data.json']);
});
const {TimerStateService}=loader.load('@/core/services/TimerStateService');
test('计时器中一个无效条目也不能被过滤后静默写回',async()=>{
 const raw=JSON.stringify({schemaVersion:3,timers:[{id:'bad'}]});const h=fakeFiles({'Think/timer-state.json':raw});
 await assert.rejects(new TimerStateService(h.files).loadStateFromFile(),/结构不受支持/);assert.equal(h.writes.length,0);assert.equal(h.map.get('Think/timer-state.json'),raw);
});
test('无效计时器保存被拒绝，不丢弃条目写入空集合',async()=>{
 const h=fakeFiles();await assert.rejects(new TimerStateService(h.files).saveStateToFile([{id:'bad'}]),/状态无效/);assert.equal(h.writes.length,0);
});

(async()=>{
 const results=[];
 for(const {name,fn} of tests){try{await fn();results.push({name,status:'passed'});console.log('PASS',name)}catch(error){results.push({name,status:'failed',message:String(error.stack||error)});console.error('FAIL',name,'\n',error.stack||error)}}
 const report={suite:'restart-timeline-source-regression',timezone:process.env.TZ||Intl.DateTimeFormat().resolvedOptions().timeZone,
 total:results.length,passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').length,
 limitations:['源函数和模拟IO，不是Obsidian真机/物理掉电/同步服务测试','DI装饰器为no-op；未替代Immer，Repository.update需由Jest用真实依赖验证','未验证真实模型语义准确率和屏幕可读性'],results};
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));
 console.log('SUMMARY',JSON.stringify({total:report.total,passed:report.passed,failed:report.failed}));process.exitCode=report.failed?1:0;
})().catch(error=>{console.error(error);process.exitCode=1});
