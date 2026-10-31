#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const temp = mkdtempSync(join(tmpdir(), 'vika-slim-updater-'));
try {
  for (const name of ['DevBuildFiles', 'VikaUpdater']) {
    const file = join(root, `src/platform/obsidian/${name}.ts`);
    const js = ts.transpileModule(readFileSync(file, 'utf8'), { fileName: file, compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    }, reportDiagnostics: true });
    assert.equal(js.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
    writeFileSync(join(temp, `${name}.js`), js.outputText);
  }
  writeFileSync(join(temp, 'ThinkDiagnostics.js'), 'exports.traceThinkOperation = async (_name, fn) => fn();');
  mkdirSync(join(temp, 'node_modules/obsidian'), { recursive: true });
  writeFileSync(join(temp, 'node_modules/obsidian/index.js'), `
exports.normalizePath = p => p;
exports.Notice = class { constructor(value){ global.__vikaNotice=value; } setMessage(value){global.__vikaNotice=value;} };
exports.requestUrl = async opts => global.__vikaHttp(opts);
exports.Modal = class { constructor(){this.modalEl={addClass: name => global.__vikaModalClass=name};this.contentEl={createEl:()=>{},empty:()=>{}};} open(){this.onOpen();} close(){this.onClose();} };
exports.Setting = class {
  constructor(){ } setName(){return this;}
  addText(cb){cb({inputEl:{},setPlaceholder(){return this;},onChange(fn){global.__vikaEnterToken=fn; return this;}});return this;}
  addButton(cb){cb({setButtonText(){return this;},setCta(){return this;},onClick(fn){global.__vikaSaveToken=fn;return this;}});return this;}
};`);
  mkdirSync(join(temp, 'node_modules/tsyringe'), { recursive: true });
  writeFileSync(join(temp, 'node_modules/tsyringe/index.js'), 'exports.container = { resolve: () => global.__vikaRepo };');
  mkdirSync(join(temp, 'node_modules/@core/services'), { recursive: true });
  writeFileSync(join(temp, 'node_modules/@core/services/public.js'), 'exports.SettingsRepository = class {};');
  if (!globalThis.crypto) globalThis.crypto = webcrypto;
  const { buildFingerprint, installDevBuild, withDevBuildLock } = require(join(temp, 'DevBuildFiles.js'));
  const { updateFromVika, openVikaTokenDialog } = require(join(temp, 'VikaUpdater.js'));
  const manifest = JSON.stringify({ id: 'think-os', version: '1.18.2', main: 'main.js', styles: 'styles.css' });
  const main = 'console.log("new");'.repeat(130);
  const oldMain = 'console.log("old");'.repeat(130);
  const css = '.think-os { color: blue; }'.repeat(30);
  const oldCss = '.think-os { color: red; }'.repeat(30);
  const cloud = { 'main.js': main, 'styles.css': css, 'manifest.json': manifest };
  const id = await buildFingerprint(cloud);
  assert.notEqual(id, await buildFingerprint({ ...cloud, 'main.js': oldMain }));
  assert.notEqual(id, await buildFingerprint({ ...cloud, 'styles.css': oldCss }));
  let settingsData = { vikaApiToken: 'MOCK-TOKEN', goals: ['keep'] };
  global.__vikaRepo = { getSettings: () => settingsData, update: async update => update(settingsData) };
  openVikaTokenDialog({});
  global.__vikaEnterToken('MOCK-NEW-TOKEN');
  await global.__vikaSaveToken();
  assert.equal(settingsData.vikaApiToken, 'MOCK-NEW-TOKEN');
  assert.equal(global.__vikaModalClass, 'think-vika-token-modal');
  assert.equal(global.__vikaNotice, undefined, 'token saved without success toast');
  assert.deepEqual(settingsData.goals, ['keep'], 'token save preserves other data');
  settingsData.vikaApiToken = 'MOCK-TOKEN';
  let row = { recordId: 'recT1234', fields: {
    '版本号': '1.18.2', '构建ID': id, '上传时间': 1793450000000,
    ...Object.fromEntries(Object.entries(cloud).map(([name, text]) => [name, [{
      token:'space/'+name, url:`https://s1.vika.cn/space/${name}`, size:Buffer.byteLength(text),
    }]])),
  }};
  let downloads = 0;
  global.__vikaHttp = async opts => {
    const url = new URL(opts.url);
    if (url.hostname === 'vika.cn') {
      assert.equal(opts.headers.Authorization, 'Bearer MOCK-TOKEN');
      return { status:200, text:JSON.stringify({code:200,success:true,data:{records:[row]}}) };
    }
    assert.equal(url.hostname, 's1.vika.cn');
    assert.equal(opts.headers?.Authorization, undefined);
    downloads++;
    const name = url.pathname.slice('/space/'.length);
    const bytes = Buffer.from(cloud[name]);
    return { status:200, arrayBuffer:bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
  };
  const disk = new Map([
    ['.obsidian/plugins/think-os/main.js',oldMain],
    ['.obsidian/plugins/think-os/styles.css',oldCss],
    ['.obsidian/plugins/think-os/manifest.json',manifest],
  ]);
  const adapter = {
    exists:async p => disk.has(p), read:async p => disk.get(p),
    write:async (p,t) => {disk.set(p,t);}, remove:async p => {disk.delete(p);},
  };
  const host = { app:{vault:{configDir:'.obsidian',adapter}}, manifest:{id:'think-os'} };
  assert.equal(await updateFromVika(host), true);
  assert.equal(downloads, 3);
  for (const [name,text] of Object.entries(cloud)) assert.equal(disk.get(`.obsidian/plugins/think-os/${name}`), text);
  assert.equal(global.__vikaNotice, undefined, 'successful update does not show routine notices');
  assert.equal(await updateFromVika(host), false);
  assert.equal(downloads, 3, 'same files skip download even when version unchanged');
  const altered = { ...cloud, 'main.js': main + '\n// modified' };
  row = { ...row, fields: { ...row.fields, '构建ID': await buildFingerprint(altered) } };
  await assert.rejects(updateFromVika(host), /云端文件校验失败/);
  assert.equal(disk.get('.obsidian/plugins/think-os/main.js'), main);
  const failureAdapter = { ...adapter, write:async (p,t) => {
    disk.set(p,t); if (p.endsWith('styles.css') && t.includes('green')) throw Error('disk full');
  }};
  await assert.rejects(installDevBuild({ ...host, app:{vault:{configDir:'.obsidian', adapter:failureAdapter}} }, {
    ...cloud, 'main.js':main+'//another', 'styles.css':css.replace(/blue/g,'green'),
  }), /已回滚/);
  assert.equal(disk.get('.obsidian/plugins/think-os/main.js'), main);
  assert.equal(disk.get('.obsidian/plugins/think-os/styles.css'), css);
  await withDevBuildLock(async()=>assert.rejects(withDevBuildLock(async()=>undefined), /正在下载或安装/));
  const control = readFileSync(join(root, 'src/features/settings/components/VikaUpdateControl.tsx'), 'utf8');
  const entry = readFileSync(join(root, 'src/main.ts'), 'utf8');
  assert(control.includes('维格表（Vika）更新'));
  assert(!control.includes('GitHub'));
  assert(!entry.includes('think-vika-update') && !entry.includes('think-vika-save-token'));
  assert(!entry.includes('think-update-github-dev-build'));
  console.log('PASS: Vika-only UI, no updater commands, token modal, hashes and rollback');
} finally { rmSync(temp, { recursive:true, force:true }); }
