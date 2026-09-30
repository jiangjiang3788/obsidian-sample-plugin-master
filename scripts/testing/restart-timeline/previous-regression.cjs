const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {createLoader} = require('./source-loader.cjs');
const root = path.resolve(process.argv[2] || process.cwd());
const env=createLoader(root), load=env.load;
const {normalizeParsedBatch}=load('@/core/ai/AiParserNormalize');
const {TASK_DEFINITION,EVENT_DEFINITION}=load('@/core/records/schema/definitions');
const {buildRecordOutputPlan}=load('@/core/recordInput/snapshot/OutputPlanner');
const model=load('@/platform/obsidian/modals/AiBatchConfirmModel');
const {decodeRecordContentLines}=load('@/core/records/codec/MarkdownRecordCodec');
const prompts=load('@/core/ai/AiParserPrompts');
const {compactSnapshotForFastMode}=load('@/core/ai/AiParserSnapshot');
const {buildAiConfigSnapshot}=load('@/core/ai/AiConfigSnapshot');
const {DEFAULT_AI_SETTINGS}=load('@/core/types/ai-schema');
const {normalizeRecordInputFormDataForTemplate}=load('@/core/recordInput/RecordInputFacade');
const {normalizeRecordInput}=load('@/core/recordInput/normalization');
const {validateRecordInput}=load('@/core/recordInput/validation');
const goal='工作/周报';
const taskTemplate={...TASK_DEFINITION,targetFile:'tasks.md',appendUnderHeader:'## 周报'};
const recordTypes=[taskTemplate,EVENT_DEFINITION];
const goalSettings={goals:[{path:goal,status:'active'}],goalTemplates:[{goalPath:goal,recordTypeId:'core.task',enabled:true}]};
const snapshot=buildAiConfigSnapshot({recordTypes},DEFAULT_AI_SETTINGS,goalSettings);
const checks=[];
function check(name,fn){try{fn();checks.push({name,status:'PASS'});console.log('PASS '+name);}catch(e){checks.push({name,status:'FAIL',error:e.message});console.log('FAIL '+name+' :: '+e.message);}}
function item(fields,target={recordTypeId:'core.task',goalPath:goal},rawText='周报已经完成了'){
 return normalizeParsedBatch({items:[{rawText,target,fieldValues:fields}]},snapshot,rawText).items[0];
}
function flow(fields,rawText){
 const cmd=item(fields,undefined,rawText);
 const [record]=model.buildAiBatchConfirmRecordItems({items:[cmd],recordTypes,goalSettings,inputSettings:{recordTypes}});
 const params=model.buildAiBatchConfirmCreateSubmitParams(record);
 const normalized=normalizeRecordInput({template:taskTemplate,formData:params.formData,mode:'ai_batch'}).normalizedFormData;
 const validation=validateRecordInput({template:taskTemplate,formData:normalized,mode:'create'});
 assert.equal(validation.ok,true,JSON.stringify(validation.errors));
 const plan=buildRecordOutputPlan({template:taskTemplate,formData:normalized,context:params.context});
 const blocks=[...plan.outputContent.matchAll(/<!-- start -->\s*([\s\S]*?)\s*<!-- end -->/g)].map(m=>decodeRecordContentLines(m[1].split('\n'),''));
 return {cmd,record,params,plan,blocks};
}
for(const [raw,expected] of [
 ['done','done'],['open','open'],['已完成','done'],['完成','done'],['completed','done'],['finished','done'],['✅ 已完成','done'],
 ['未完成','open'],['待办','open'],['进行中','open'],['未做完','open'],['in_progress','open'],
 [{value:'completed',label:'已完成'},'done'],[{label:'已完成'},'done'],[{value:'open',label:'✅ 已完成'},'open'],
 ['已取消','cancelled'],['已跳过','skipped'],
])check('AI状态规范化 '+JSON.stringify(raw),()=>assert.equal(item({status:raw}).fieldValues.status,expected));
check('中文状态字段归一至唯一status',()=>assert.deepEqual(item({'状态':'已完成'}).fieldValues,{status:'done'}));
check('未知状态不伪造为open',()=>assert.equal(item({status:'surprise'}).fieldValues.status,'surprise'));
check('不会扫描整段文字把未来计划判完成',()=>assert.equal(item({status:'open',任务内容:'明天完成周报'},undefined,'明天完成周报').fieldValues.status,'open'));
check('不会扫描整段文字把否定判完成',()=>assert.equal(item({status:'open'},undefined,'周报还没完成').fieldValues.status,'open'));
check('缺少状态时不凭全文给所有子项补done',()=>assert.equal(item({任务内容:'明天写代码'},undefined,'周报已完成，明天写代码').fieldValues.status,undefined));
check('不改变其他记录类型的同名字段',()=>assert.equal(item({status:'completed'},{recordTypeId:'core.event',goalPath:goal}).fieldValues.status,'completed'));
check('规范化不修改调用方字段对象',()=>{const fields={'状态':'已完成'};item(fields);assert.deepEqual(fields,{'状态':'已完成'});});
check('记录类型中文名称转canonical id',()=>assert.equal(item({status:'done'},{recordTypeId:'任务',goalPath:goal}).target.recordTypeId,'core.task'));
check('多目标匹配不选第一项',()=>{
 const s={...snapshot,goalPresets:[{id:'a',goalPath:'A',recordTypeId:'core.task'},{id:'b',goalPath:'B',recordTypeId:'core.task'}]};
 const cmd=normalizeParsedBatch({items:[{rawText:'周报',target:{recordTypeId:'core.task'},fieldValues:{}}]},s,'周报').items[0];
 assert.equal(cmd.target.goalPath,undefined);assert.equal(cmd.target.goalTemplateId,undefined);
});
check('无任何目标线索不补第一模板',()=>{
 const cmd=normalizeParsedBatch({items:[{rawText:'随便记点',target:{recordTypeId:''},fieldValues:{}}]},snapshot,'随便记点').items[0];
 assert.equal(cmd.target.recordTypeId,'');assert.equal(cmd.target.goalPath,undefined);
});
check('显式模板与目标冲突时不覆盖目标',()=>{
 const s={...snapshot,goalPresets:[{id:'wrong',goalPath:'别的目标',recordTypeId:'core.task'}]};
 const cmd=normalizeParsedBatch({items:[{rawText:'周报',target:{recordTypeId:'core.task',goalPath:goal,goalTemplateId:'wrong'},fieldValues:{}}]},s,'周报').items[0];
 assert.equal(cmd.target.goalPath,goal);
});
check('明确且唯一的目标类型仍可解析模板',()=>assert.ok(item({status:'done'}).target.goalTemplateId));
for(const raw of ['done','已完成','completed','✅ 已完成',{value:'completed',label:'已完成'}])check('AI→草稿→校验→Markdown回读保持done '+JSON.stringify(raw),()=>{
 const r=flow({status:raw,任务内容:'周报',completedAt:'2026-09-29T10:00:00'});
 assert.equal(r.blocks[0].status,'done');assert.equal(r.blocks[0].completedAt,'2026-09-29T10:00');
});
check('domain边界拒绝未知status（而非保存open）',()=>assert.throws(()=>buildRecordOutputPlan({template:taskTemplate,formData:{status:'surprise',任务内容:'周报',goalPath:goal}}),/task_status_invalid/));
check('提交校验返回明确状态错误',()=>{
 const result=validateRecordInput({template:taskTemplate,formData:{status:'completed',任务内容:'周报',goalPath:goal},mode:'create'});
 assert.equal(result.ok,false);assert.ok(result.errors.some(e=>e.code==='task_status_invalid'));
});
check('singleSelect与普通select采用相同枚举规范化',()=>{
 const f=normalizeRecordInputFormDataForTemplate(taskTemplate,{status:'done'});
 assert.deepEqual(f.status,{value:'done',label:'✅ 已完成'});
});
check('AI已完成创建带执行上下文',()=>{
 const r=flow({status:'done',任务内容:'周报'});assert.equal(r.params.context.__recordUiContext?.captureMode,'completed_execution');
});
check('实际60分钟写入TaskSession，Task不存预计60分钟',()=>{
 const r=flow({status:'done',任务内容:'周报',startAt:'2026-09-29T09:00:00',endAt:'2026-09-29T10:00:00',expectedDurationMinutes:60});
 assert.equal(r.blocks.length,2);const task=r.blocks.find(x=>x.recordType==='task'),session=r.blocks.find(x=>x.recordType==='task-session');
 assert.equal(task.status,'done');assert.equal(task.expectedDurationMinutes,undefined);assert.equal(task.startAt,undefined);assert.equal(task.endAt,undefined);
 assert.equal(session.sessionDurationMinutes,60);assert.equal(session.sessionResult,'task-completed');assert.equal(session.taskId,task.recordId);
});
check('实际跨午夜时段写入正确120分钟',()=>{
 const r=flow({status:'已完成',任务内容:'测试',startAt:'2026-09-29T23:30:00',endAt:'2026-09-30T01:30:00'});
 assert.equal(r.blocks.find(x=>x.recordType==='task-session')?.sessionDurationMinutes,120);
});
check('已完成但无起止时间不伪造工作块',()=>{const r=flow({status:'done',任务内容:'周报'});assert.equal(r.blocks.length,1);assert.equal(r.blocks[0].status,'done');});
check('未完成保留计划时长，不创建工作块',()=>{
 const r=flow({status:'open',任务内容:'周报',scheduledAt:'2026-10-01T09:00:00',expectedDurationMinutes:60});
 assert.equal(r.blocks.length,1);assert.equal(r.blocks[0].status,'open');assert.equal(r.blocks[0].expectedDurationMinutes,60);assert.equal(r.params.context.__recordUiContext,undefined);
});
check('AI实际执行上下文不覆盖更具体的Timeline来源',()=>{
 const params=model.buildAiBatchConfirmCreateSubmitParams({recordTypeId:'core.task',formData:{status:'done'},editorContext:{__recordUiContext:{kind:'timeline_create',captureMode:'completed_execution'}}});
 assert.equal(params.context.__recordUiContext.kind,'timeline_create');
});
check('取消信号仍传递',()=>{const c=new AbortController();const p=model.buildAiBatchConfirmCreateSubmitParams({recordTypeId:'core.task',formData:{status:'done'},editorContext:{}},c.signal);assert.equal(p.signal,c.signal);});
check('Timeline完成入口仍覆盖旧open值',()=>{
 const p=buildRecordOutputPlan({template:taskTemplate,formData:{status:'open',任务内容:'周报',goalPath:goal},context:{__recordUiContext:{kind:'timeline_create',captureMode:'completed_execution'}}});
 assert.match(p.outputContent,/状态:: done/);
});
check('快照包含实际起止与完成时间字段',()=>{const t=snapshot.recordTypes.find(t=>t.id==='core.task');for(const k of ['startAt','endAt','completedAt'])assert.ok(t.fields.some(f=>f.key===k),k);});
check('任务Goal快照也包含执行字段',()=>{for(const k of ['startAt','endAt','completedAt'])assert.ok(snapshot.goalPresets[0].fields.some(f=>f.key===k),k);});
check('快速快照保留状态枚举',()=>{const c=compactSnapshotForFastMode(snapshot);assert.ok(c.recordTypes[0].fields.find(f=>f.key==='status').options.some(o=>o.value==='done'));});
check('快速模式保留Goal专属自定义字段',()=>{
 const s={...snapshot,goalPresets:[{...snapshot.goalPresets[0],fields:[{key:'自定义字段',label:'自定义字段',type:'singleSelect',options:[{value:'abc',label:'示例'}]}]}]};
 const text=prompts.buildAiFastUserPrompt('测试','2026-09-30T20:00:00+08:00',3,compactSnapshotForFastMode(s));
 assert.ok(text.includes('自定义字段'));assert.ok(text.includes('abc'));
});
for(const fast of [false,true])check((fast?'快速':'普通')+'提示词明确状态/否定/实际执行约束',()=>{
 const p=fast?prompts.buildAiFastSystemPrompt(''):prompts.buildAiSystemPrompt(snapshot,'');
 for(const word of ['fieldValues.status','还没完成','scheduledAt','startAt','existing task'])assert.ok(p.includes(word),word);
});
check('本地当前时间带明确时区且可还原同一时刻',()=>{
 const d=new Date('2026-09-29T23:59:58.000Z'),formatted=prompts.formatAiLocalNow(d);
 assert.match(formatted,/[-+]\d{2}:\d{2}$/);assert.equal(new Date(formatted).getTime(),d.getTime());
});
check('原文不会被字段规范化覆盖',()=>assert.equal(item({status:'completed'},undefined,'  周报已完成  ').rawText,'  周报已完成  '));
check('原型属性名称不能成为任务状态',()=>assert.equal(item({status:'constructor'}).fieldValues.status,'constructor'));
check('已落盘任务状态投影显示已完成',()=>{
 const r=flow({status:'已完成',任务内容:'周报'});
 const {getTaskStatusPresentation}=load('@/core/records/task/taskStatus');
 assert.equal(getTaskStatusPresentation(r.blocks[0].status).label,'已完成');
});
check('已完成实际工作块参与目标盘点60分钟',()=>{
 const r=flow({status:'done',任务内容:'周报',startAt:'2026-09-29T09:00:00',endAt:'2026-09-29T10:00:00'});
 const {buildGoalTimeAllocationSummary}=load('@/core/goal/timeAllocation');
 const records=r.blocks.map(b=>({...b,id:b.recordId}));
 const summary=buildGoalTimeAllocationSummary({records,goals:[{path:goal,status:'active'}],presetRevisions:[],rangeStart:new Date('2026-09-29T00:00:00'),rangeEnd:new Date('2026-09-29T23:59:59.999'),now:new Date('2026-09-30T00:00:00')});
 assert.equal(summary.trackedMinutes,60);assert.equal(summary.observationCoverageMinutes,60);
 assert.equal(summary.unknownMinutes,1380);
});
const result={root,total:checks.length,passed:checks.filter(x=>x.status==='PASS').length,failed:checks.filter(x=>x.status==='FAIL').length,sourceModules:env.cache.size,omittedUnusedImports:[...env.omitted],checks};
console.log('\nSUMMARY '+JSON.stringify({total:result.total,passed:result.passed,failed:result.failed,sourceModules:result.sourceModules,omittedUnusedImports:result.omittedUnusedImports}));
const outputPath=process.argv[3]||process.env.RESULT_JSON;
if(outputPath){fs.mkdirSync(path.dirname(outputPath),{recursive:true});fs.writeFileSync(outputPath,JSON.stringify(result,null,2));}
process.exitCode=result.failed?1:0;
