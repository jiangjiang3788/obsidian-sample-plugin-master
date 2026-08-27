import fs from 'node:fs';
import path from 'node:path';

export const HISTORY_DIR = path.resolve('reports', 'testing', 'history');


export function publicTestTitle(value) {
  const text = String(value || '').trim();
  if (!text) return '未命名用例';
  return /[\u3400-\u9fff]/.test(text) ? text : '未中文命名的源码用例';
}


export function structuredRunSucceeded(data) {
  if (!data || typeof data !== 'object') return false;
  const cases = data.counts?.cases;
  const files = data.counts?.files;
  const caseTotal = Number(cases?.total ?? 0);
  const fileTotal = Number(files?.total ?? 0);
  const caseFailed = Number(cases?.failed ?? 0);
  const fileFailed = Number(files?.failed ?? 0);
  if (caseTotal > 0 || fileTotal > 0) return caseFailed === 0 && fileFailed === 0;
  return data.success === true;
}

export function ensureHistoryDir() {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
  return HISTORY_DIR;
}

export function readJsonSafe(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function appendJsonArray(file, item, limit = 100) {
  const existing = readJsonSafe(file, []);
  const list = Array.isArray(existing) ? existing : [];
  list.push(item);
  const trimmed = list.slice(-Math.max(1, limit));
  writeJson(file, trimmed);
  return trimmed;
}

function fmtTime(value) {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(new Date(value));
  } catch { return String(value || '—'); }
}

export function recordStructuredTestRun(structuredFile, extra = {}) {
  if (!structuredFile || !fs.existsSync(structuredFile)) return null;
  const data = readJsonSafe(structuredFile, null);
  if (!data) return null;
  const historyFile = path.join(ensureHistoryDir(), 'test-runs.json');
  const entry = {
    schemaVersion: 1,
    recordedAt: new Date().toISOString(),
    kind: data.kind || 'unknown',
    label: data.label || extra.label || '测试',
    suite: data.suite || extra.suite || null,
    success: structuredRunSucceeded(data),
    startedAt: data.startedAt || null,
    durationMs: Number(data.durationMs || 0),
    counts: data.counts || {},
    slowCases: Array.isArray(data.slowCases) ? data.slowCases.slice(0, 10) : [],
    source: path.relative(process.cwd(), structuredFile).replace(/\\/g, '/'),
  };
  const history = appendJsonArray(historyFile, entry, 120);
  writeTestTrendReport(history);
  return entry;
}

export function writeTestTrendReport(history = null) {
  const historyFile = path.join(ensureHistoryDir(), 'test-runs.json');
  const rows = history || readJsonSafe(historyFile, []);
  const recent = Array.isArray(rows) ? rows.slice(-30) : [];
  const successes = recent.filter((row) => row.success).length;
  const failures = recent.length - successes;
  const durations = recent.map((row) => Number(row.durationMs || 0)).filter((value) => value > 0);
  const average = durations.length ? Math.round(durations.reduce((sum, n) => sum + n, 0) / durations.length) : 0;
  const slow = recent.flatMap((row) => (row.slowCases || []).map((item) => ({ ...item, label: row.label })))
    .filter((item) => Number.isFinite(item.durationMs))
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 12);

  const lines = [
    '# Think OS 测试历史趋势',
    '',
    `- 最近记录：${recent.length} 次`,
    `- 通过：${successes} 次`,
    `- 失败：${failures} 次`,
    `- 平均耗时：${average}ms`,
    '',
    '## 最近运行',
    '',
    '| 时间 | 类型 | 测试 | 结果 | 耗时 |',
    '|---|---|---|---|---:|',
  ];
  for (const row of [...recent].reverse()) {
    lines.push(`| ${fmtTime(row.startedAt || row.recordedAt)} | ${row.kind === 'e2e' ? '真机' : 'Jest'} | ${String(row.label || row.suite || '测试').replace(/\|/g, '\\|')} | ${row.success ? '通过' : '失败'} | ${Number(row.durationMs || 0)}ms |`);
  }
  lines.push('', '## 历史最慢用例', '', '| 耗时 | 用例 | 来源 |', '|---:|---|---|');
  for (const item of slow) {
    lines.push(`| ${item.durationMs}ms | ${publicTestTitle(item.title).replace(/\|/g, '\\|')} | ${String(item.file || item.label || '—').replace(/\|/g, '\\|')} |`);
  }
  if (!slow.length) lines.push('| — | 暂无结构化耗时数据 | — |');
  fs.writeFileSync(path.join(HISTORY_DIR, 'test-trend.md'), `${lines.join('\n')}\n`);
}

export function listJsonFilesRecursive(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJsonFilesRecursive(full));
    else if (entry.name.endsWith('.json')) out.push(full);
  }
  return out;
}
