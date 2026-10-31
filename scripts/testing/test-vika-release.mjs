#!/usr/bin/env node
/** Direct 3-file Vika update: mocked network, real TypeScript updater and filesystem installer. */
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
const temp = mkdtempSync(join(tmpdir(), 'vika-plain-files-'));
try {
  const dist = join(temp, 'compiled'); mkdirSync(dist);
  for (const name of ['DevBuildInstaller', 'DevBuildFingerprint', 'VikaReleaseUpdater']) {
    const source = readFileSync(join(root, `src/platform/obsidian/${name}.ts`), 'utf8');
    const compiled = ts.transpileModule(source, { fileName: `${name}.ts`, compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    }, reportDiagnostics: true });
    assert.equal(compiled.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
    writeFileSync(join(dist, `${name}.js`), compiled.outputText);
  }
  writeFileSync(join(dist, 'ThinkDiagnostics.js'), 'exports.traceThinkOperation = async (_name, cb) => cb();');
  mkdirSync(join(dist, 'node_modules/obsidian'), { recursive: true });
  writeFileSync(join(dist, 'node_modules/obsidian/index.js'), `
exports.normalizePath = path => path;
exports.Notice = class { constructor(text){global.__vikaNotice = text;} };
exports.requestUrl = async options => global.__vikaHttp(options);`);
  mkdirSync(join(dist, 'node_modules/tsyringe'), { recursive: true });
  writeFileSync(join(dist, 'node_modules/tsyringe/index.js'), 'exports.container = { resolve: () => global.__vikaRepo };');
  mkdirSync(join(dist, 'node_modules/@core/services'), { recursive: true });
  writeFileSync(join(dist, 'node_modules/@core/services/public.js'), 'exports.SettingsRepository = class {};');
  if (!globalThis.crypto) globalThis.crypto = webcrypto;
  const { contentBuildId } = require(join(dist, 'DevBuildFingerprint.js'));
  const { installDevBuild, withDevBuildInstallLock } = require(join(dist, 'DevBuildInstaller.js'));
  const { inspectVikaBuild, pullVikaBuild, saveVikaCredential, hasVikaCredential } = require(join(dist, 'VikaReleaseUpdater.js'));

  const manifest = JSON.stringify({ id: 'think-os', version: '1.18.2', main: 'main.js', styles: 'styles.css' });
  const oldMain = 'console.log("old");'.repeat(130);
  const newMain = 'console.log("new");'.repeat(130);
  const oldCss = '.think-os{color:red}'.repeat(30);
  const newCss = '.think-os{color:blue}'.repeat(30);
  const cloud = { 'main.js': newMain, 'styles.css': newCss, 'manifest.json': manifest };
  const id = await contentBuildId(cloud);
  assert.notEqual(id, await contentBuildId({ ...cloud, 'main.js': oldMain }), 'main.js change triggers update');
  assert.notEqual(id, await contentBuildId({ ...cloud, 'styles.css': oldCss }), 'CSS change triggers update');
  let tokenSettings = { vikaApiToken: '', goalSettings: { goals: ['must-remain'] } };
  global.__vikaRepo = { getSettings: () => tokenSettings, update: async callback => { callback(tokenSettings); } };
  await saveVikaCredential('  MOCK-TOKEN  ');
  assert.equal(hasVikaCredential(), true);
  assert.equal(tokenSettings.vikaApiToken, 'MOCK-TOKEN');
  assert.deepEqual(tokenSettings.goalSettings, { goals: ['must-remain'] }, 'other Think/data.json values retained');

  let row = { recordId: 'recT1234', fields: {
    '版本号': '1.18.2', '构建ID': id, '上传时间': 1793450000000,
    ...Object.fromEntries(Object.entries(cloud).map(([name, text]) => [name, [{
      name, token: 'space/' + name, url: `https://s1.vika.cn/space/${name}`, size: Buffer.byteLength(text),
    }]])),
  }};
  let fileRequests = 0;
  let corrupt = null;
  global.__vikaHttp = async (opts) => {
    const url = new URL(opts.url);
    if (url.hostname === 'vika.cn') {
      assert.equal(opts.headers.Authorization, 'Bearer MOCK-TOKEN');
      return { status: 200, text: JSON.stringify({ code: 200, success: true, data: { records: [row] } }) };
    }
    assert.equal(url.hostname, 's1.vika.cn');
    assert.equal(opts.headers?.Authorization, undefined, 'no token passed to attachment CDN');
    fileRequests++;
    const name = decodeURIComponent(url.pathname.slice('/space/'.length));
    const buffer = Buffer.from(corrupt === name ? cloud[name].replace('new', 'xxx') : cloud[name]);
    return { status: 200, arrayBuffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) };
  };
  const disk = new Map([
    ['.obsidian/plugins/think-os/main.js', oldMain],
    ['.obsidian/plugins/think-os/styles.css', oldCss],
    ['.obsidian/plugins/think-os/manifest.json', manifest],
  ]);
  const adapter = {
    exists: async p => disk.has(p), read: async p => disk.get(p),
    write: async (p, value) => { disk.set(p, value); }, remove: async p => { disk.delete(p); },
  };
  const host = { manifest: { id: 'think-os' }, app: { vault: { configDir: '.obsidian', adapter } } };
  assert.equal((await inspectVikaBuild(host)).isNewBuild, true, 'changed JS/CSS update even if manifest version same');
  assert.equal((await pullVikaBuild(host)).isNewBuild, true);
  for (const [name, text] of Object.entries(cloud)) assert.equal(disk.get(`.obsidian/plugins/think-os/${name}`), text);
  assert.equal(fileRequests, 3, 'download exactly three attachments');
  assert.match(global.__vikaNotice, /完全退出/);
  assert.equal((await inspectVikaBuild(host)).isNewBuild, false);
  assert.equal((await pullVikaBuild(host)).isNewBuild, false);
  assert.equal(fileRequests, 3, 'identical build skipped');

  const failingAdapter = { ...adapter, write: async (p, value) => {
    disk.set(p, value);
    if (p.endsWith('styles.css') && value.includes('green')) throw new Error('disk full');
  }};
  await assert.rejects(installDevBuild({ ...host, app: { vault: { configDir: '.obsidian', adapter: failingAdapter } } }, {
    ...cloud, 'main.js': newMain + '//change', 'styles.css': newCss.replace('blue', 'green'),
  }), /已回滚/);
  assert.equal(disk.get('.obsidian/plugins/think-os/main.js'), newMain, 'rollback restores old main.js');
  assert.equal(disk.get('.obsidian/plugins/think-os/styles.css'), newCss, 'rollback restores old CSS');
  await withDevBuildInstallLock(async () => {
    await assert.rejects(withDevBuildInstallLock(async () => undefined), /正在下载或安装/);
  });

  const altered = { ...cloud, 'main.js': newMain + '\n// changed again' };
  row = { ...row, fields: { ...row.fields, '构建ID': await contentBuildId(altered) } };
  await assert.rejects(pullVikaBuild(host), /内容指纹不一致/);
  assert.equal(disk.get('.obsidian/plugins/think-os/main.js'), newMain, 'invalid content cannot overwrite local');
  console.log('PASS: 3 independent files + Think/data.json settings + same manifest version + skip + hash + rollback + lock');
} finally { rmSync(temp, { recursive: true, force: true }); }
