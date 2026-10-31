#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const API = 'https://vika.cn/fusion/v1';
const DATASHEET = 'dstoKKbqk6Rv7E3vhy';
const SPACE = 'spcfzyVwNPUzq';
const FILES = ['main.js', 'styles.css', 'manifest.json'];
const FIELD = { version: '版本号', build: '构建ID', time: '上传时间' };
const COLUMNS = [
  { name: FIELD.version, type: 'SingleText', property: { defaultValue: '' } },
  { name: FIELD.build, type: 'SingleText', property: { defaultValue: '' } },
  { name: FIELD.time, type: 'DateTime', property: { dateFormat: 'YYYY-MM-DD', includeTime: true, timeFormat: 'HH:mm', autoFill: false } },
  ...FILES.map(name => ({ name, type: 'Attachment', property: {} })),
];
const args = process.argv.slice(2);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function options() {
  let data;
  let diagnose = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--diagnose') diagnose = true;
    else if (arg === '--data') data = args[++i];
    else if (arg.startsWith('--data=')) data = arg.slice(7);
    else throw new Error(`不支持参数：${arg}`);
  }
  if (args.includes('--data') && !data) throw new Error('--data 后需要 Think/data.json 路径');
  return { diagnose, data };
}

function tokenFromData(explicit) {
  const locations = explicit || process.env.THINK_DATA_JSON
    ? [resolve(explicit || process.env.THINK_DATA_JSON)]
    : [join(ROOT, '../../../Think/data.json'), join(ROOT, 'Think/data.json'), join(ROOT, '../Think/data.json')];
  const path = locations.find(existsSync);
  if (!path) throw new Error('未找到 Think/data.json，请使用 --data "G:\\vikahz\\Think\\data.json" 指定路径');
  let data;
  try { data = JSON.parse(readFileSync(path, 'utf8')); }
  catch { throw new Error(`Think/data.json 不是有效 JSON：${path}`); }
  const token = data?.vikaApiToken;
  if (typeof token !== 'string' || !token.trim() || /\s/.test(token)) throw new Error('Think/data.json 中缺少有效的 vikaApiToken');
  return token.trim();
}

function localBuild() {
  const files = Object.fromEntries(FILES.map(name => {
    const path = join(ROOT, name);
    if (!existsSync(path)) throw new Error(`缺少 ${name}，请先构建插件`);
    return [name, readFileSync(path)];
  }));
  if (files['main.js'].length < 1000 || files['styles.css'].length < 100) throw new Error('main.js 或 styles.css 文件大小异常');
  let manifest;
  try { manifest = JSON.parse(files['manifest.json'].toString('utf8')); }
  catch { throw new Error('manifest.json 不是有效 JSON'); }
  if (manifest.id !== 'think-os' || !manifest.version || (manifest.main && manifest.main !== 'main.js')) {
    throw new Error('manifest.json 的 ID、版本号或入口文件无效');
  }
  const hash = createHash('sha256').update('think-os-build-v1\0');
  for (const name of FILES) {
    const bytes = files[name];
    hash.update(`${name}\0${bytes.length}\0`); hash.update(bytes); hash.update('\0');
  }
  return { files, version: manifest.version, id: hash.digest('hex') };
}

function delayFor(error, attempt) {
  return Math.max(error.retryAfter || 0, Math.min(30000, 3000 * 2 ** attempt));
}

class ApiError extends Error {
  constructor(label, response, body, retryAfter, token) {
    const code = body?.code;
    const message = String(body?.message || '无错误详情').replaceAll(token, '[REDACTED]').replace(/[\r\n\t]/g, ' ').slice(0, 100);
    const source = body ? '维格表' : '网关或代理可能返回了非 JSON 响应';
    super(`${label} HTTP ${response.status}${code && code !== response.status ? ` / ${code}` : ''}：${message}（${source}）`);
    this.limited = response.status === 429 || code === 429;
    this.retryAfter = retryAfter;
  }
}

class Vika {
  constructor(token) { this.token = token; this.lastRequest = 0; }

  async request(path, init = {}, label = '请求', retryWrite = false) {
    const reading = !init.method || init.method.toUpperCase() === 'GET';
    for (let attempt = 0; ; attempt++) {
      await wait(Math.max(0, this.lastRequest + 1300 - Date.now()));
      this.lastRequest = Date.now();
      let response;
      try {
        response = await fetch(`${API}${path}`, {
          ...init,
          headers: { Authorization: `Bearer ${this.token}`, ...init.headers },
          signal: AbortSignal.timeout(60000),
        });
      } catch {
        if (reading && attempt < 2) { await wait(3000 * 2 ** attempt); continue; }
        throw new Error(`${label} 连接中断或超时；若处于写入阶段，请先核对云端`);
      }
      let body;
      try { body = JSON.parse(await response.text()); } catch { body = null; }
      if (response.ok && body?.success === true && body.code === 200) return body.data;
      const retryHeader = response.headers?.get?.('retry-after');
      const seconds = Number(retryHeader);
      const dateDelay = Date.parse(retryHeader);
      const retryAfter = retryHeader == null ? 0 : Number.isFinite(seconds)
        ? Math.max(0, Math.min(60000, seconds * 1000))
        : Number.isFinite(dateDelay) ? Math.max(0, Math.min(60000, dateDelay - Date.now())) : 0;
      const error = new ApiError(label, response, body, retryAfter, this.token);
      if (attempt < 4 && ((reading && (error.limited || response.status >= 500)) || (retryWrite && error.limited && body))) {
        await wait(delayFor(error, attempt));
        continue;
      }
      throw error;
    }
  }

  async fields() {
    const data = await this.request(`/datasheets/${DATASHEET}/fields`, {}, '读取字段');
    if (!Array.isArray(data?.fields)) throw new Error('维格表返回的字段结构无效');
    return data.fields;
  }

  async ensureColumns() {
    let columns = await this.fields();
    const verify = (column, expected) => {
      if (column.type !== expected.type || column.editable === false) throw new Error(`字段「${expected.name}」类型或权限不正确`);
      if (expected.type === 'DateTime' && column.property?.includeTime !== true) throw new Error('上传时间字段需要开启时间显示');
    };
    for (const expected of COLUMNS) {
      let column = columns.find(item => item.name === expected.name);
      if (column) { verify(column, expected); continue; }
      for (let attempt = 0; ; attempt++) {
        try {
          await this.request(`/spaces/${SPACE}/datasheets/${DATASHEET}/fields`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(expected),
          }, `创建字段「${expected.name}」`);
          break;
        } catch (error) {
          if (!(error instanceof ApiError) || !error.limited || attempt >= 3) throw error;
          await wait(delayFor(error, attempt));
          columns = await this.fields();
          column = columns.find(item => item.name === expected.name);
          if (column) { verify(column, expected); break; }
        }
      }
    }
    columns = await this.fields();
    for (const expected of COLUMNS) {
      const column = columns.find(item => item.name === expected.name);
      if (!column) throw new Error(`字段「${expected.name}」没有创建成功`);
      verify(column, expected);
    }
    const primary = columns.find(item => item.isPrimary && item.editable !== false && ['SingleText', 'Text'].includes(item.type));
    return primary?.name || null;
  }

  async records() {
    const params = new URLSearchParams({ pageSize: '100', pageNum: '1' });
    params.append('sort[][field]', FIELD.time); params.append('sort[][order]', 'desc');
    const data = await this.request(`/datasheets/${DATASHEET}/records?${params}`, {}, '读取发布记录');
    if (!Array.isArray(data?.records)) throw new Error('发布记录返回格式无效');
    return data.records;
  }

  async upload(name, bytes) {
    const mime = name.endsWith('.json') ? 'application/json' : name.endsWith('.css') ? 'text/css' : 'text/javascript';
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: mime }), name);
    const data = await this.request(`/datasheets/${DATASHEET}/attachments`, { method: 'POST', body: form }, `上传 ${name}`, true);
    if (!data?.token || !data?.name || data.size !== bytes.length) throw new Error(`上传 ${name} 后收到无效的附件信息`);
    return [{ token: data.token, name: data.name, size: data.size, mimeType: data.mimeType || mime }];
  }

  async create(fields) {
    const data = await this.request(`/datasheets/${DATASHEET}/records`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records: [{ fields }] }),
    }, '创建发布记录');
    const id = data?.records?.[0]?.recordId;
    if (typeof id !== 'string') throw new Error('发布记录缺少 recordId');
    return id;
  }

  async record(id) {
    const data = await this.request(`/datasheets/${DATASHEET}/records?recordIds=${encodeURIComponent(id)}`, {}, '回读发布记录');
    return data?.records?.find(row => row.recordId === id);
  }
}

function complete(row, id) {
  return row?.fields?.[FIELD.build] === id && FILES.every(name =>
    Array.isArray(row.fields[name]) && row.fields[name].length === 1 && row.fields[name][0]?.token);
}

async function main() {
  const { diagnose, data } = options();
  const api = new Vika(tokenFromData(data));
  if (diagnose) {
    const fields = await api.fields();
    console.log(`数据表：${DATASHEET}\n字段：${fields.map(field => `${field.name}(${field.type})`).join('、')}`);
    console.log(`缺少：${COLUMNS.filter(column => !fields.some(field => field.name === column.name)).map(column => column.name).join('、') || '无'}`);
    return;
  }
  const build = localBuild();
  const primary = await api.ensureColumns();
  if ((await api.records()).some(row => complete(row, build.id))) return;
  const attachments = {};
  for (const name of FILES) attachments[name] = await api.upload(name, build.files[name]);
  const time = Date.now();
  const fields = { [FIELD.version]: build.version, [FIELD.build]: build.id, [FIELD.time]: time, ...attachments };
  if (primary && !(primary in fields)) fields[primary] = `Think OS ${build.version} · ${build.id.slice(0, 12)}`;
  let id;
  try { id = await api.create(fields); }
  catch (error) {
    id = (await api.records()).find(row => complete(row, build.id))?.recordId;
    if (!id) throw error;
  }
  const saved = await api.record(id);
  if (!complete(saved, build.id) || saved.fields[FIELD.time] !== time || saved.fields[FIELD.version] !== build.version) {
    throw new Error('发布记录回读校验失败，请检查维格表');
  }
}

main().catch(error => {
  console.error(`维格表发布失败：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
