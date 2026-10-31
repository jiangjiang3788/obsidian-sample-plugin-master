#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const temp = mkdtempSync(join(tmpdir(), 'vika-direct-publisher-'));
try {
  const plugin = join(temp, '.obsidian/plugins/obsidian-sample-plugin-master');
  mkdirSync(join(plugin, 'scripts/build'), { recursive: true });
  mkdirSync(join(temp, 'Think'), { recursive: true });
  copyFileSync(join(root, 'scripts/build/publish-vika.mjs'), join(plugin, 'scripts/build/publish-vika.mjs'));
  const manifest = JSON.stringify({ id: 'think-os', version: '1.18.2', main: 'main.js', styles: 'styles.css' });
  const main = 'console.log("changed")'.repeat(110);
  const css = '.think-os{color:blue}'.repeat(30);
  writeFileSync(join(plugin, 'manifest.json'), manifest);
  writeFileSync(join(plugin, 'main.js'), main);
  writeFileSync(join(plugin, 'styles.css'), css);
  writeFileSync(join(temp, 'Think/data.json'), JSON.stringify({ goalSettings: { goals: ['do-not-delete'] }, vikaApiToken: 'MOCK-TOKEN' }));
  const preloaded = join(temp, 'mock.cjs');
  const report = join(temp, 'report.json');
  writeFileSync(preloaded, `
const fs = require('fs');
const root = ${JSON.stringify(plugin)};
const report = ${JSON.stringify(report)};
const req = [{name:'标题',type:'SingleText',editable:true,isPrimary:true}];
const realSetTimeout = global.setTimeout;
global.setTimeout = (fn, ms, ...args) => realSetTimeout(fn, Math.min(ms, 5), ...args);
const fileNames = ['main.js','styles.css','manifest.json'];
let uploads = [], row = null, field429 = false, upload429 = false;
const reply = data => new Response(JSON.stringify({code:200,success:true,data}), {status:200});
global.fetch = async (input, opts={}) => {
  const url = new URL(input);
  if (url.hostname !== 'vika.cn') throw new Error('Unexpected host');
  if (opts.headers?.Authorization !== 'Bearer MOCK-TOKEN') throw new Error('Wrong token');
  if (url.pathname.endsWith('/fields') && opts.method === 'POST') {
    const f = JSON.parse(opts.body); req.push({...f, editable:true});
    if (f.name === 'main.js' && !field429) { field429 = true; return new Response(JSON.stringify({code:429,success:false,message:'too frequent'}), {status:429}); }
    return reply(f);
  }
  if (url.pathname.endsWith('/fields')) return reply({fields:req});
  if (url.pathname.endsWith('/attachments')) {
    const file = opts.body.get('file');
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!fileNames.includes(file.name) || !bytes.equals(fs.readFileSync(root+'/'+file.name))) throw new Error('bad uploaded file');
    if (file.name === 'styles.css' && !upload429) { upload429=true; return new Response(JSON.stringify({code:429,success:false,message:'too frequent'}), {status:429}); }
    uploads.push(file.name);
    return reply({token:'space/'+file.name, name:file.name, size:bytes.length, mimeType:'text/plain'});
  }
  if (url.pathname.endsWith('/records') && opts.method === 'POST') {
    const fields = JSON.parse(opts.body).records[0].fields;
    for (const name of fileNames) if (fields[name]?.length !== 1) throw new Error('missing '+name);
    if (typeof fields['上传时间'] !== 'number') throw new Error('no timestamp');
    row = {recordId:'rec1234',fields};
    fs.writeFileSync(report, JSON.stringify({row,uploads,req}));
    return reply({records:[row]});
  }
  if (url.pathname.endsWith('/records')) return reply({records:row?[row]:[]});
  throw new Error('Unexpected path '+url.pathname);
};`);
  const diagnoseOutput = execFileSync(process.execPath, ['--require', preloaded, join(plugin, 'scripts/build/publish-vika.mjs'), '--diagnose'], {
    cwd:plugin, encoding:'utf8', timeout:25000,
  });
  assert.match(diagnoseOutput, /缺少/);
  assert.ok(!existsSync(report), 'diagnose does not publish');
  const output = execFileSync(process.execPath, ['--require', preloaded, join(plugin, 'scripts/build/publish-vika.mjs')], {
    cwd:plugin, encoding:'utf8', timeout:25000,
  });
  assert.equal(output, '', 'normal publish is silent on success');
  const data = JSON.parse(readFileSync(report, 'utf8'));
  assert.deepEqual(data.uploads, ['main.js', 'styles.css', 'manifest.json']);
  assert.equal(data.row.fields['版本号'], '1.18.2');
  assert.match(data.row.fields['构建ID'], /^[a-f0-9]{64}$/);
  assert.ok(Number.isFinite(data.row.fields['上传时间']));
  assert.equal(data.row.fields['安装包'], undefined, 'no ZIP field');
  assert.ok(data.req.find(f => f.name === '上传时间').property.includeTime);
  assert.equal(data.req.filter(f => f.name === 'main.js').length, 1, '429 created field is not duplicated');
  assert.deepEqual(JSON.parse(readFileSync(join(temp,'Think/data.json'), 'utf8')).goalSettings.goals, ['do-not-delete']);
  console.log('PASS: auto-discovers Vault settings, handles 429 safely, silent publish and read-only diagnose');
} finally { rmSync(temp, { recursive: true, force: true }); }
