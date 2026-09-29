#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();

function fail(message) {
  console.error(`\n[发布] ${message}`);
  process.exit(1);
}

function run(command, args, { capture = false, allowFailure = false } = {}) {
  const shown = [command, ...args].join(' ');
  console.log(`\n> ${shown}`);

  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  if (result.error) {
    if (allowFailure) return { ok: false, stdout: '', stderr: String(result.error) };
    fail(`${command} 无法运行：${result.error.message}`);
  }

  const ok = result.status === 0;
  if (!ok && !allowFailure) {
    if (capture && result.stderr) console.error(result.stderr.trim());
    fail(`命令失败：${shown}`);
  }

  return {
    ok,
    stdout: capture ? (result.stdout ?? '').trim() : '',
    stderr: capture ? (result.stderr ?? '').trim() : '',
  };
}

function runNpm(args, options = {}) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) fail('无法定位 npm CLI，请通过 npm run 发布启动。');
  return run(process.execPath, [npmCli, ...args], options);
}

function readJson(file) {
  return JSON.parse(readFileSync(join(root, file), 'utf8'));
}

function writeJson(file, data) {
  writeFileSync(join(root, file), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function syncProjectVersion(version) {
  const pkg = readJson('package.json');
  if (pkg.version !== version) {
    console.log(`[发布] package.json 版本同步为 ${version}`);
    pkg.version = version;
    writeJson('package.json', pkg);
  }

  if (existsSync(join(root, 'package-lock.json'))) {
    const lock = readJson('package-lock.json');
    let changed = false;

    if (lock.version !== version) {
      lock.version = version;
      changed = true;
    }

    if (lock.packages?.[''] && lock.packages[''].version !== version) {
      lock.packages[''].version = version;
      changed = true;
    }

    if (changed) {
      console.log(`[发布] package-lock.json 版本同步为 ${version}`);
      writeJson('package-lock.json', lock);
    }
  }
}

function getRepository() {
  run('gh', ['auth', 'status']);
  const result = run('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'], {
    capture: true,
  });
  if (!result.stdout) fail('无法识别当前 GitHub 仓库。请确认这个目录已经关联 GitHub remote。');
  return result.stdout;
}

function disableGitHubActions(repository) {
  console.log(`\n[发布] 关闭 ${repository} 的 GitHub Actions，之后 push/tag/release 都不会自动跑 CI。`);
  run('gh', [
    'api',
    '-X',
    'PUT',
    `repos/${repository}/actions/permissions`,
    '-F',
    'enabled=false',
  ]);
  console.log('[发布] GitHub Actions 已关闭。');
}

const manifest = readJson('manifest.json');
const version = String(manifest.version ?? '').trim();
const pluginId = String(manifest.id ?? '').trim();
const pluginName = String(manifest.name ?? pluginId ?? 'Obsidian Plugin').trim();

if (!version) fail('manifest.json 里没有 version。');
if (!pluginId) fail('manifest.json 里没有 id。');

const repository = getRepository();

if (process.argv.includes('--disable-actions-only')) {
  console.log('\n[发布] 完成。只关闭了 GitHub Actions，没有构建或发布版本。');
  process.exit(0);
}

console.log(`\n[发布] 使用 manifest.json 中的版本：${version}`);
console.log('[发布] 不会自动增加版本号。');

syncProjectVersion(version);
runNpm(['run', 'build:release']);

const releaseZip = `${pluginId}-release.zip`;
const assets = ['main.js', 'manifest.json', 'styles.css', releaseZip];
for (const asset of assets) {
  if (!existsSync(join(root, asset))) fail(`缺少发布文件：${asset}`);
}

run('git', ['add', 'manifest.json', 'package.json', 'package-lock.json', 'main.js', 'styles.css']);
const staged = run('git', ['diff', '--cached', '--quiet'], { allowFailure: true });
if (!staged.ok) {
  run('git', ['commit', '-m', `release: ${version}`]);
} else {
  console.log('\n[发布] Git 没有新的文件变化，跳过 commit。');
}

run('git', ['push']);

const existingRelease = run('gh', ['release', 'view', version], {
  capture: true,
  allowFailure: true,
});

if (existingRelease.ok) {
  fail(`GitHub Release ${version} 已存在。发布版本不可覆盖，请递增版本号后重新发布。`);
} else {
  const head = run('git', ['rev-parse', 'HEAD'], { capture: true }).stdout;
  run('gh', [
    'release',
    'create',
    version,
    ...assets,
    '--title',
    `${pluginName} ${version}`,
    '--generate-notes',
    '--target',
    head,
  ]);
}

console.log(`\n[发布] 完成：${pluginName} ${version}`);
console.log('[发布] 下次只需要先改 manifest.json 的 version，然后再次运行：npm run 发布');
