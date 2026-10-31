#!/usr/bin/env node
/** Mock Vika HTTP; verify that the publisher reads Think/data.json, no ZIP and 3 attachments. */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const temp = mkdtempSync(join(tmpdir(), 'vika-direct-publisher-'));
try {
  mkdirSync(join(temp, 'scripts/build'), { recursive: true });
  mkdirSync(join(temp, 'Think'), { recursive: true });
  copyFileSync(join(root, 'scripts/build/publish-vika.mjs'), join(temp, 'scripts/build/publish-vika.mjs'));
  const manifest = JSON.stringify({ id: 'think-os', version: '1.18.2', main: 'main.js', styles: 'styles.css' });
  const main = 'console.log("changed")'.repeat(110);
  const css = '.think-os{color:blue}'.repeat(30);
  writeFileSync(join(temp, 'manifest.json'), manifest);
  writeFileSync(join(temp, 'main.js'), main);
  writeFileSync(join(temp, 'styles.css'), css);
  writeFileSync(join(temp, 'Think/data.json'), JSON.stringify({ goalSettings: { goals: ['do-not-delete'] }, vikaApiToken: 'MOCK-TOKEN' }));
  const preloaded = join(temp, 'mock.cjs');
  const report = join(temp, 'report.json');
  writeFileSync(preloaded, `
const fs = require('fs');
const root = ${JSON.stringify(temp)};
const report = ${JSON.stringify(report)};
const req = [{name:'标题',type:'SingleText',editable:true,isPrimary:true}];
const fileNames = ['main.js','styles.css','manifest.json'];
let uploads = [], row = null;
const reply = data => new Response(JSON.stringify({code:200,success:true,data}), {status:200});
global.fetch = async (input, opts={}) => {
  const url = new URL(input);
  if (url.hostname !== 'vika.cn') throw new Error('Unexpected host');
  if (opts.headers?.Authorization !== 'Bearer MOCK-TOKEN') throw new Error('Wrong token');
  if (url.pathname.endsWith('/fields') && opts.method === 'POST') {
    const f = JSON.parse(opts.body); req.push({...f, editable:true}); return reply(f);
  }
  if (url.pathname.endsWith('/fields')) return reply({fields:req});
  if (url.pathname.endsWith('/attachments')) {
    const file = opts.body.get('file');
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!fileNames.includes(file.name) || !bytes.equals(fs.readFileSync(root+'/'+file.name))) throw new Error('bad uploaded file');
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
  const output = execFileSync(process.execPath, ['--require', preloaded, join(temp, 'scripts/build/publish-vika.mjs')], {
    cwd:temp, encoding:'utf8', timeout:25000,
  });
  assert.match(output, /上传成功/);
  const data = JSON.parse(readFileSync(report, 'utf8'));
  assert.deepEqual(data.uploads, ['main.js', 'styles.css', 'manifest.json']);
  assert.equal(data.row.fields['版本号'], '1.18.2');
  assert.match(data.row.fields['构建ID'], /^[a-f0-9]{64}$/);
  assert.ok(Number.isFinite(data.row.fields['上传时间']));
  assert.equal(data.row.fields['安装包'], undefined, 'no ZIP field');
  assert.ok(data.req.find(f => f.name === '上传时间').property.includeTime);
  assert.deepEqual(JSON.parse(readFileSync(join(temp,'Think/data.json'), 'utf8')).goalSettings.goals, ['do-not-delete']);
  console.log('PASS: reads Think/data.json, uploads 3 original files, writes upload time, no ZIP, preserves settings');
} finally { rmSync(temp, { recursive: true, force: true }); }
