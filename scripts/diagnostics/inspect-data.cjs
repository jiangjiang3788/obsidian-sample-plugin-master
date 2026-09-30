#!/usr/bin/env node
// READ ONLY. No vault writes, initialization, module loading or credential output.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const args = process.argv.slice(2);
function arg(name, fallback) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; }
const vaultInput = arg('--vault');
if (!vaultInput || args.includes('--help')) {
 console.log('用法: node scripts/diagnostics/inspect-data.cjs --vault "仓库根目录" [--config-dir .obsidian] [--plugin-id think-os]');
 console.log('只读取摘要与 SHA-256。不打印 API Key、正文、目标名称或聊天内容。');
 process.exit(vaultInput ? 0 : 2);
}
const vault = path.resolve(vaultInput);
if (!fs.existsSync(vault) || !fs.statSync(vault).isDirectory()) { console.error('仓库目录不存在'); process.exit(2); }
const configDir = arg('--config-dir', '.obsidian');
const pluginId = arg('--plugin-id', 'think-os');
const base = ['Think/data.json', `${configDir}/plugins/${pluginId}/data.json`, 'data.json',
 'Think/cache.json', 'Think/timer-state.json', 'Think/chat-sessions.json', 'Think/whiteboards.json'];
const files = [...base];
for (const file of base.filter((file) => file.startsWith('Think/') && file !== 'Think/cache.json')) {
 files.push(`${file}.pending`, `Think/Backups/storage/${encodeURIComponent(file)}.previous.json`);
}
const counts = (value) => ({ goals: Array.isArray(value?.goalSettings?.goals) ? value.goalSettings.goals.length : null,
 templates: Array.isArray(value?.goalSettings?.goalTemplates) ? value.goalSettings.goalTemplates.length : null,
 views: Array.isArray(value?.viewInstances) ? value.viewInstances.length : null,
 layouts: Array.isArray(value?.layouts) ? value.layouts.length : null,
 sessions: Array.isArray(value?.sessions) ? value.sessions.length : null,
 boards: value?.boards && typeof value.boards === 'object' ? Object.keys(value.boards).length : null,
 timers: Array.isArray(value?.timers) ? value.timers.length : null,
 cachedFiles: value?.files && typeof value.files === 'object' ? Object.keys(value.files).length : null });
const report = { mode: 'READ_ONLY', checkedAt: new Date().toISOString(), files: [], findings: [] };
for (const file of [...new Set(files)]) {
 const full = path.resolve(vault, file);
 if (full !== vault && !full.startsWith(vault + path.sep)) { console.error('路径超出仓库，拒绝读取'); process.exit(2); }
 try {
  const stat = fs.statSync(full);
  if (!stat.isFile()) { report.files.push({ path: file, state: 'PATH_IS_NOT_FILE' }); continue; }
  const raw = fs.readFileSync(full);
  const row = { path: file, bytes: raw.length, modified: stat.mtime.toISOString(), sha256: crypto.createHash('sha256').update(raw).digest('hex') };
  try {
   const value = JSON.parse(raw.toString('utf8').replace(/^\uFEFF/, ''));
   row.state = value === null ? 'INVALID_NULL' : 'PARSED';
   row.currentSettingsShape = !!(value && !Array.isArray(value) && Array.isArray(value.goalSettings?.goals) && Array.isArray(value.goalSettings?.goalTemplates));
   row.counts = counts(value);
  } catch { row.state = 'INVALID_JSON'; }
  report.files.push(row);
 } catch (error) {
  report.files.push({ path: file, state: error.code === 'ENOENT' ? 'MISSING' : 'READ_ERROR', errorCode: error.code });
 }
}
const primary = report.files.find((row) => row.path === 'Think/data.json');
const old = report.files.find((row) => row.path === `${configDir}/plugins/${pluginId}/data.json`);
if (primary?.state === 'MISSING' && old?.state === 'PARSED') report.findings.push('仅旧插件目录有配置；当前源码不会自动读取或迁移它。');
if (primary?.state === 'PARSED' && !primary.currentSettingsShape) report.findings.push('主配置 JSON 可解析但不是当前目标结构；不应按空配置保存。');
if (primary?.state === 'PARSED' && primary.counts.goals === 0 && primary.counts.views === 0 && primary.counts.layouts === 0) report.findings.push('主配置可解析但目标/视图/布局均为空；不能仅凭该状态断定如何变空。');
for (const row of report.files) {
 if (row.state === 'INVALID_JSON' || row.state === 'INVALID_NULL') report.findings.push(`${row.path}: 内容无效，先保全原件再恢复。`);
 if (row.path.endsWith('.pending') && row.state !== 'MISSING') report.findings.push(`${row.path}: 存在待核对写入日志，不要直接删除。`);
}
console.log(JSON.stringify(report, null, 2));
// Diagnostic success != product acceptance. Missing/corrupt primary is an attention result.
if (primary?.state !== 'PARSED' || !primary.currentSettingsShape) process.exitCode = 2;
