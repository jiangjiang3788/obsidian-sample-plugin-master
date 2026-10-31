#!/usr/bin/env node
/** Upload the three EXISTING build files and a timestamp, without rebuilding or ZIP.
 * Reads API credentials exclusively from canonical Think/data.json.
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const API = 'https://vika.cn/fusion/v1';
const DATASHEET = 'dstoKKbqk6Rv7E3vhy';
const SPACE = 'spcfzyVwNPUzq';
const NAMES = ['main.js', 'styles.css', 'manifest.json'];
const F = { version: '版本号', build: '构建ID', uploaded: '上传时间' };
const FIELD_DEFINITIONS = [
  { name: F.version, type: 'SingleText', property: { defaultValue: '' } },
  { name: F.build, type: 'SingleText', property: { defaultValue: '' } },
  { name: F.uploaded, type: 'DateTime', property: { dateFormat: 'YYYY-MM-DD', includeTime: true, timeFormat: 'HH:mm', autoFill: false } },
  ...NAMES.map(name => ({ name, type: 'Attachment', property: {} })),
];
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const diagnose = args.includes('--diagnose');
const sleep = ms => new Promise(done => setTimeout(done, ms));
// Leave headroom for the free-tier 2 QPS limit and other clients using this account/table.
const MIN_REQUEST_INTERVAL_MS = 1300;
const RATE_RETRIES = 4;

function retryAfterMs(header) {
  if (!header) return 0;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(60000, seconds * 1000);
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(0, Math.min(60000, date - Date.now())) : 0;
}
function retryDelay(attempt, serverDelay = 0) {
  return Math.max(serverDelay, Math.min(30000, 3000 * (2 ** attempt)));
}
class VikaRequestError extends Error {
  constructor(title, status, code, message, retryAfter, jsonResponse, uncertain = false) {
    const detail = String(message || '服务端未提供详细信息').replace(/[\r\n\t]/g, ' ').slice(0, 120);
    const source = jsonResponse ? '维格表 API' : '非 JSON 响应（可能来自代理或网关）';
    super(`${title} HTTP ${status}${code && code !== status ? ` / 业务码 ${code}` : ''}：${detail}；${source}`);
    this.rateLimited = status === 429 || code === 429;
    this.retryAfter = retryAfter;
    this.uncertain = uncertain;
  }
}


function resolveDataFile() {
  const optionIdx = args.indexOf('--data');
  if (optionIdx >= 0 && !args[optionIdx + 1]) throw new Error('--data 后面需要指定 Think/data.json 的绝对路径');
  const custom = optionIdx >= 0 ? args[optionIdx + 1] : args.find(arg => arg.startsWith('--data='))?.slice(7);
  const allowed = ['--dry-run', '--diagnose', '--data'];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--data') { i++; continue; }
    if (!allowed.includes(args[i]) && !args[i].startsWith('--data=')) throw new Error(`不支持参数：${args[i]}`);
  }
  const explicit = custom || process.env.THINK_DATA_JSON;
  if (explicit) {
    const filename = resolve(explicit);
    if (!existsSync(filename)) throw new Error(`Think/data.json 不存在：${filename}`);
    return filename;
  }
  const candidates = [
    join(root, 'Think', 'data.json'),
    join(root, '..', 'Think', 'data.json'),
    join(process.cwd(), 'Think', 'data.json'),
  ];
  const found = [...new Set(candidates)].find(existsSync);
  if (!found) throw new Error('未找到 Think/data.json。请运行 npm run 发布:维格 -- --data "D:\\你的库\\Think\\data.json" 指定实际文件位置');
  return found;
}
function getToken() {
  const path = resolveDataFile();
  let settings;
  try { settings = JSON.parse(readFileSync(path, 'utf8')); }
  catch { throw new Error(`读取 Think/data.json 失败：${path}，请先检查文件是否为有效 JSON`); }
  const token = settings?.vikaApiToken;
  if (typeof token !== 'string' || !token.trim() || /\s/.test(token)) {
    throw new Error('Think/data.json 缺少有效的 vikaApiToken，请在 Think OS 设置中保存 API 令牌');
  }
  console.log(`本地配置：${path}（不显示令牌）`);
  return token.trim();
}
function buildId(files) {
  const h = createHash('sha256').update('think-os-build-v1\0', 'utf8');
  for (const name of NAMES) {
    const bytes = files[name];
    h.update(`${name}\0${bytes.length}\0`, 'utf8'); h.update(bytes); h.update('\0');
  }
  return h.digest('hex');
}
function readArtifacts() {
  const files = Object.fromEntries(NAMES.map(name => {
    const path = join(root, name);
    if (!existsSync(path)) throw new Error(`缺少 ${name}：请先在此项目执行 npm run build，再发布`);
    return [name, readFileSync(path)];
  }));
  if (files['main.js'].length < 1000 || files['styles.css'].length < 100 || files['manifest.json'].length < 50) {
    throw new Error('编译后的三个文件大小异常，未发布');
  }
  let manifest;
  try { manifest = JSON.parse(files['manifest.json'].toString('utf8')); }
  catch { throw new Error('manifest.json 无法解析'); }
  if (manifest.id !== 'think-os' || !manifest.version || (manifest.main && manifest.main !== 'main.js')) {
    throw new Error('manifest.json 的插件 ID、版本号或主文件异常');
  }
  return { files, version: manifest.version, buildId: buildId(files) };
}
class VikaApi {
  constructor(token) { this.token = token; this.lastRequest = 0; }
  async request(path, options = {}, title = '维格表请求', { retryRateLimit = false } = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const safeRead = method === 'GET';
    for (let attempt = 0; ; attempt++) {
      const wait = Math.max(0, this.lastRequest + MIN_REQUEST_INTERVAL_MS - Date.now());
      if (wait) await sleep(wait);
      this.lastRequest = Date.now();
      let response;
      try {
        response = await fetch(`${API}${path}`, {
          ...options,
          headers: { Authorization: `Bearer ${this.token}`, ...(options.headers || {}) },
          signal: AbortSignal.timeout(60000),
        });
      } catch {
        if (safeRead && attempt < 2) {
          const ms = retryDelay(attempt);
          console.warn(`${title} 网络异常，${ms / 1000} 秒后重试读取（${attempt + 1}/2）`);
          await sleep(ms);
          continue;
        }
        throw new VikaRequestError(title, '网络错误', null,
          '连接中断或超时；若发生在写入阶段，请先查看云端是否已创建', 0, false, !safeRead);
      }
      let json = null;
      try { json = JSON.parse(await response.text()); } catch { /* Some VPN/proxy/CDN errors are HTML. */ }
      if (response.ok && json?.success === true && json?.code === 200) return json.data;
      const error = new VikaRequestError(
        title, response.status, json?.code, json?.message,
        retryAfterMs(response.headers?.get('retry-after')), json !== null,
      );
      const retryable = error.rateLimited || (safeRead && response.status >= 500 && response.status <= 599);
      if (retryable && attempt < RATE_RETRIES && (safeRead || (retryRateLimit && error.rateLimited && json !== null))) {
        const ms = retryDelay(attempt, error.retryAfter);
        console.warn(`${title} HTTP ${response.status}${json?.code && json.code !== response.status ? ` / 业务码 ${json.code}` : ''}，${ms / 1000} 秒后重试（${attempt + 1}/${RATE_RETRIES}）`);
        await sleep(ms);
        continue;
      }
      throw error;
    }
  }
  async readFields() {
    const data = await this.request(`/datasheets/${DATASHEET}/fields`, {}, '读取字段');
    if (!Array.isArray(data?.fields)) throw new Error('维格表字段返回格式错误');
    return data.fields;
  }
  async diagnose() {
    console.log('只读诊断：不会创建字段、上传附件或修改任何记录。');
    const fields = await this.readFields();
    const missing = FIELD_DEFINITIONS.filter(def => !fields.some(field => field.name === def.name));
    console.log(`目标数据表：${DATASHEET}；空间站：${SPACE}`);
    console.log('请与浏览器页面地址核对： https://vika.cn/workbench/' + DATASHEET + '/viwvymUHdux0E');
    console.log(`字段读取成功（共 ${fields.length} 列）。`);
    console.log('当前字段：' + (fields.map(field => `${field.name}(${field.type})`).join('、') || '无'));
    console.log(missing.length ? `待创建字段：${missing.map(field => field.name).join('、')}` : '六个发布字段均已存在。');
    for (const def of FIELD_DEFINITIONS) {
      const found = fields.find(field => field.name === def.name);
      if (found && (found.type !== def.type || found.editable === false)) {
        console.warn(`需要修正字段：${def.name}；当前类型 ${found.type}，目标类型 ${def.type}；可编辑：${found.editable !== false}`);
      }
    }
    console.log('诊断结束：仅发送读取字段请求，未创建字段、上传文件或写入记录。');
  }
  async ensureFields() {
    let fields = await this.readFields();
    const validate = (field, definition) => {
      if (field.type !== definition.type || field.editable === false) {
        throw new Error(`字段「${definition.name}」类型应为 ${definition.type} 且允许编辑；请检查现有字段`);
      }
      if (field.type === 'DateTime' && field.property?.includeTime !== true) {
        throw new Error('「上传时间」日期列尚未启用时间显示，请在维格表里开启');
      }
    };
    for (const definition of FIELD_DEFINITIONS) {
      let existing = fields.find(field => field.name === definition.name);
      if (existing) { validate(existing, definition); continue; }
      // A timed-out create may actually have succeeded. Re-read before resending.
      for (let attempt = 0; ; attempt++) {
        try {
          await this.request(`/spaces/${SPACE}/datasheets/${DATASHEET}/fields`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(definition),
          }, `创建字段「${definition.name}」`);
          console.log(`自动创建字段：${definition.name}`);
          break;
        } catch (error) {
          if (!(error instanceof VikaRequestError) || (!error.rateLimited && !error.uncertain)
            || attempt >= RATE_RETRIES) throw error;
          const ms = retryDelay(attempt, error.retryAfter);
          console.warn(`创建字段「${definition.name}」遇到限流或网络中断，${ms / 1000} 秒后核对云端（${attempt + 1}/${RATE_RETRIES}）`);
          await sleep(ms);
          fields = await this.readFields();
          existing = fields.find(field => field.name === definition.name);
          if (existing) {
            validate(existing, definition);
            console.log(`字段已在云端存在，跳过重复创建：${definition.name}`);
            break;
          }
          console.warn(`云端尚无字段「${definition.name}」，准备重新创建`);
        }
      }
    }
    fields = await this.readFields();
    for (const def of FIELD_DEFINITIONS) {
      const field = fields.find(f => f.name === def.name);
      if (!field) throw new Error(`字段 ${def.name} 创建失败`);
      validate(field, def);
    }
    const primary = fields.find(f => f.isPrimary === true);
    return primary && ['Text', 'SingleText'].includes(primary.type) && primary.editable !== false ? primary.name : null;
  }
  async rows() {
    const q = new URLSearchParams();
    q.append('pageSize', '100'); q.append('pageNum', '1');
    q.append('sort[][field]', F.uploaded); q.append('sort[][order]', 'desc');
    const data = await this.request(`/datasheets/${DATASHEET}/records?${q}`, {}, '获取上传记录');
    if (!Array.isArray(data?.records)) throw new Error('维格表上传记录格式异常');
    return data.records;
  }
  async upload(name, bytes) {
    const form = new FormData();
    const mime = name.endsWith('.json') ? 'application/json' : name.endsWith('.css') ? 'text/css' : 'text/javascript';
    form.append('file', new Blob([bytes], { type: mime }), name);
    const data = await this.request(`/datasheets/${DATASHEET}/attachments`, {
      method: 'POST', body: form,
    }, `上传 ${name}`, { retryRateLimit: true });
    if (!data?.token || !data?.name || data.size !== bytes.length) throw new Error(`上传 ${name} 返回的附件内容异常`);
    return data;
  }
  async create(fields) {
    const data = await this.request(`/datasheets/${DATASHEET}/records`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: [{ fields }] }),
    }, '创建上传记录');
    if (!data?.records?.[0]?.recordId) throw new Error('创建记录未返回 recordId，需人工核对');
    return data.records[0].recordId;
  }
  async byId(id) {
    const data = await this.request(`/datasheets/${DATASHEET}/records?recordIds=${encodeURIComponent(id)}`, {}, '回读上传记录');
    return data?.records?.find(row => row.recordId === id);
  }
}
function isCompleteRow(row, buildIdValue) {
  return row?.fields?.[F.build] === buildIdValue && NAMES.every(name => {
    const files = row.fields?.[name];
    return Array.isArray(files) && files.length === 1 && files[0]?.token;
  });
}
async function main() {
  if (diagnose) { await new VikaApi(getToken()).diagnose(); return; }
  const build = readArtifacts();
  console.log(`1/3 直接使用现有三个文件：版本 ${build.version} · 构建 ${build.buildId.slice(0, 12)}`);
  if (dryRun) { console.log('检查完成，未连接维格表、未上传任何文件。'); return; }
  const api = new VikaApi(getToken());
  const primary = await api.ensureFields();
  const previous = (await api.rows()).find(row => isCompleteRow(row, build.buildId));
  if (previous) { console.log(`该构建已上传，无需重复操作：${previous.recordId}`); return; }
  console.log('2/3 逐个上传三个原始文件...');
  const attachments = {};
  for (const name of NAMES) {
    const data = await api.upload(name, build.files[name]);
    attachments[name] = [{ name: data.name, size: data.size, token: data.token, mimeType: data.mimeType || 'application/octet-stream' }];
    console.log(`  已上传：${name}`);
  }
  const uploadedAt = Date.now();
  const fields = { [F.version]: build.version, [F.build]: build.buildId, [F.uploaded]: uploadedAt, ...attachments };
  if (primary && !(primary in fields)) fields[primary] = `Think OS ${build.version} · ${build.buildId.slice(0, 12)}`;
  console.log('3/3 写入一条完整记录及上传时间...');
  let id;
  try { id = await api.create(fields); }
  catch (error) {
    const found = (await api.rows()).find(row => isCompleteRow(row, build.buildId));
    if (!found?.recordId) throw error;
    id = found.recordId;
  }
  const saved = await api.byId(id);
  if (!isCompleteRow(saved, build.buildId) || saved?.fields?.[F.uploaded] !== uploadedAt
    || saved?.fields?.[F.version] !== build.version) {
    throw new Error(`记录 ${id} 回读校验失败，请查看维格表，未报告发布成功`);
  }
  console.log(`\n上传成功：${id}\n构建ID：${build.buildId}\n上传时间：${new Date(uploadedAt).toLocaleString('zh-CN')}`);
}
main().catch(error => { console.error(`\n上传失败：${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
