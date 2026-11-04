#!/usr/bin/env node
// 离线验证正式 npm test 的调度、失败、超时、报告与异常保护；不运行项目的真实 Jest。
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const runner = path.join(here, 'run-jest-with-timeout.mjs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'thinkos-native-jest-check-'));
const root = path.join(temp, '中文 路径 with spaces');
const reports = path.join(temp, 'reports');
const jest = path.join(root, 'fake-jest.cjs');
const config = path.join(root, 'test/configs/jest.core.config.js');
const reporter = path.join(root, 'test/configs/jest-reporter.zh-CN.cjs');
const fake = String.raw`
const fs = require('node:fs');
const path = require('node:path');
const scenario = process.env.THINK_TEST_INTERNAL_CASE;
const args = process.argv.slice(2);
const root = process.env.THINK_TEST_INTERNAL_ROOT;
const names = {
  pass:['中文 with spaces.test.ts','last.test.ts'],
  many:Array.from({length:291},(_,i)=>'file-'+String(i).padStart(3,'0')+'.test.ts'),
  fail:['中文 with spaces.test.ts','fail.test.ts','last.test.ts'],
  hang:['中文 with spaces.test.ts','hang.test.ts','last.test.ts'],
  twohang:['hang.test.ts','last.test.ts','hang-2.test.ts','end.test.ts'],
  crash:['crash.test.ts','last.test.ts'],
  ghost:['last.test.ts'],
  teardown:['last.test.ts'],
  startup:['last.test.ts'],
  empty:[], badjson:[], skip:['last.test.ts'],
};
const list = names[scenario] || [];
if (args.includes('--listTests')) {
  if (scenario === 'badjson') { process.stdout.write('not json'); process.exit(0); }
  let selected = list;
  const pattern = args.find(x => x.endsWith('.test.ts'));
  if (pattern) selected = list.filter(x => x.includes(pattern));
  process.stdout.write(JSON.stringify(selected.map(x=>path.join(root,'test/unit',x))));
  process.exit(0);
}
const selected = args.slice(args.indexOf('--runTestsByPath')+1).filter(x=>x.endsWith('.test.ts'));
const events = process.env.THINK_TEST_GUARD_EVENTS_FILE;
if (!events || args.indexOf('--runTestsByPath')<0) process.exit(23);
function emit(e){fs.appendFileSync(events,JSON.stringify({...e,at:Date.now()})+'\n');}
async function main(){
  if(scenario==='startup'){setInterval(()=>{},1000);return;}
  let failures=0;
  for(const file of selected){
    if(!list.includes(path.basename(file))) process.exit(24);
    const abs=path.join(root,file);
    const name=path.basename(file);
    emit({event:'start',file:abs});
    if(name.startsWith('hang')){setInterval(()=>{},1000);return;}
    if(name==='crash.test.ts')process.exit(19);
    await new Promise(resolve=>setTimeout(resolve,scenario==='many'?2:18));
    const status=name==='fail.test.ts'?'fail':scenario==='skip'?'skip':'pass';
    if(status==='fail')failures++;
    emit({event:'result',file:abs,status,durationMs:12,...(status==='fail'?{
      reason:'Expected true; Received false',expected:'true',actual:'false'}:{})});
  }
  if(scenario!=='ghost')emit({event:'complete',success:failures===0});
  if(scenario==='teardown'){setInterval(()=>{},1000);return;}
  process.exitCode=failures?1:0;
}
main().catch(e=>{console.error(e);process.exitCode=22});
`;

function scenario(name, { selected = [], interrupt = false } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [runner, ...selected], {
      cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, THINK_TEST_INTERNAL_SELFTEST: '1',
        THINK_TEST_INTERNAL_ROOT: root, THINK_TEST_INTERNAL_JEST: jest,
        THINK_TEST_INTERNAL_CONFIG: config, THINK_TEST_INTERNAL_REPORT_DIR: reports,
        THINK_TEST_INTERNAL_CASE: name, THINK_TEST_FILE_TIMEOUT_MS: '550' },
    });
    let output = '';
    p.stdout.on('data', x => output += String(x));
    p.stderr.on('data', x => output += String(x));
    p.once('error', reject);
    const timer = setTimeout(() => { p.kill('SIGKILL'); reject(new Error(`场景 ${name} 未正常结束：${output}`)); }, 15000);
    const signalTimer = interrupt ? setTimeout(() => p.kill('SIGINT'), 250) : null;
    p.once('close', (code) => {
      clearTimeout(timer); clearTimeout(signalTimer);
      try {
        const summary = JSON.parse(fs.readFileSync(path.join(reports,'日常测试-汇总.json'),'utf8'));
        resolve({ code, output, summary });
      } catch (e) { reject(e); }
    });
  });
}
function checkCounts(result, values) {
  const { passed, failed, timedOut, skipped, notRun } = result.summary.counts;
  assert.deepEqual([passed, failed, timedOut, skipped, notRun], values, result.output);
  assert.equal(new Set(result.summary.files.map(x => x.file)).size, result.summary.files.length, '不可重复报告同一文件');
}
try {
  fs.mkdirSync(path.dirname(config), { recursive: true });
  fs.writeFileSync(config, 'module.exports={};\n');
  fs.writeFileSync(jest, fake);
  fs.mkdirSync(path.dirname(reporter), { recursive: true });
  let r = await scenario('pass');
  assert.equal(r.code, 0, r.output); checkCounts(r, [2,0,0,0,0]);
  assert.match(r.output, /OOO.*中文 with spaces\.test\.ts/);
  console.log('OOO  中文空格路径、正常通过、准确退出码');

  r = await scenario('many');
  assert.equal(r.code,0,r.output); checkCounts(r,[291,0,0,0,0]);
  console.log('OOO  291 文件原生批量调度，不重复汇总');

  r = await scenario('fail');
  assert.equal(r.code,1,r.output); checkCounts(r,[2,1,0,0,0]);
  assert.match(r.output, /XXX.*fail\.test\.ts/);
  assert.match(r.output, /期望：true/);
  assert.match(r.output, /实际：false/);
  console.log('OOO  真实失败继续、原始原因与断言值');

  r = await scenario('hang');
  assert.equal(r.code,1,r.output); checkCounts(r,[2,0,1,0,0]);
  assert.match(r.output,/!!!.*hang\.test\.ts/);
  console.log('OOO  卡住自动终止、补跑后续文件');

  r = await scenario('twohang');
  assert.equal(r.code,1,r.output); checkCounts(r,[2,0,2,0,0]);
  console.log('OOO  连续卡住、准确汇总');

  r = await scenario('crash');
  assert.equal(r.code,1,r.output); checkCounts(r,[1,1,0,0,0]);
  console.log('OOO  Jest 异常退出记为失败，继续执行');

  for (const name of ['ghost','teardown','startup','empty','badjson']) {
    r = await scenario(name);
    assert.notEqual(r.code,0,r.output);
    assert.equal(r.summary.success,false,r.output);
  }
  console.log('OOO  无完成事件、收尾/启动卡住、空列表和无效列表均不能误报通过');

  r = await scenario('skip');
  assert.equal(r.code,1,r.output); checkCounts(r,[0,0,0,1,0]);
  console.log('OOO  跳过的测试不计为通过');

  r = await scenario('pass',{selected:['last.test.ts']});
  assert.equal(r.code,0,r.output); checkCounts(r,[1,0,0,0,0]);
  console.log('OOO  单文件筛选');

  if (process.platform !== 'win32') {
    r = await scenario('hang',{interrupt:true});
    assert.equal(r.code,130,r.output);
    assert.equal(r.summary.interrupted,true);
    assert.equal(r.summary.success,false);
    console.log('OOO  Ctrl+C 状态（非 Windows）');
  }
  console.log('【自检】核心场景全部通过；真实 Jest 和 Windows 10 仍需独立验收。');
} catch (error) {
  console.error(`XXX  自检失败：${error?.stack || error}`);
  process.exitCode = 1;
} finally {
  try { fs.rmSync(temp,{recursive:true,force:true}); } catch {}
}
