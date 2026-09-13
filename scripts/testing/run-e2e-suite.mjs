import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { publicTestTitle, recordStructuredTestRun } from './history-utils.mjs';
import { wdioInvocation } from './process-launch.mjs';

const suite = String(process.argv[2] || 'p0').trim().toLowerCase();
const supported = new Set(['smoke', 'p0', 'p1', 'p2', 'ui', 'runtime', 'ai', 'scale', 'compat', 'all']);
const labels = {
  smoke: '启动冒烟与插件生命周期',
  p0: 'P0 核心用户流程',
  p1: 'P1 重要功能',
  p2: 'P2 辅助体验与设备适配',
  ui: '真实界面交互',
  runtime: '真实 Obsidian 运行时',
  ai: 'AI 自然语言真实链路',
  scale: '真实 Obsidian 大仓库性能',
  compat: 'Obsidian 版本兼容矩阵',
  all: '全部真实 Obsidian 测试',
};

if (!supported.has(suite)) {
  console.error(`未知真机测试套件：${suite}。可选：${Array.from(supported).join('、')}`);
  process.exit(2);
}

const reportDir = path.resolve('reports', 'testing');
fs.mkdirSync(reportDir, { recursive: true });
const rawLogPath = path.join(reportDir, `e2e-${suite}-技术日志.txt`);
const runId = `${suite}-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
const runResultDir = path.join(reportDir, 'e2e-results', runId);
const runJsonlPath = path.join(runResultDir, '用例结果.jsonl');
const structuredFile = path.join(reportDir, `e2e-${suite}-结构化结果.json`);
const startedAt = new Date();

function startLocalAiServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (req.method === 'GET' && req.url?.endsWith('/models')) {
          res.end(JSON.stringify({ data: [{ id: 'think-e2e-local-model' }] }));
          return;
        }
        if (req.method !== 'POST' || !req.url?.endsWith('/chat/completions')) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: { message: '测试服务未提供该接口' } }));
          return;
        }
        if (body.includes('触发失败')) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: { message: '本地 AI 测试服务模拟失败' } }));
          return;
        }
        const parsed = {
          items: [{
            rawText: 'V6 AI 真机任务',
            target: { recordTypeId: 'core.task', goalPath: 'E2E/AI' },
            fieldValues: { 内容: 'V6 AI 真机任务' },
            meta: { confidence: 0.99 },
          }],
        };
        res.end(JSON.stringify({
          id: 'think-e2e-chat-completion',
          object: 'chat.completion',
          choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify(parsed) }, finish_reason: 'stop' }],
        }));
      });
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('无法取得本地 AI 测试服务端口'));
        return;
      }
      resolve({ server, endpoint: `http://127.0.0.1:${address.port}/v1` });
    });
  });
}

const needsLocalAi = suite === 'ai' || suite === 'p1' || suite === 'p2' || suite === 'all';
let aiServer = null;
let aiEndpoint = process.env.THINK_E2E_AI_ENDPOINT || '';
if (needsLocalAi && !aiEndpoint) {
  try {
    const started = await startLocalAiServer();
    aiServer = started.server;
    aiEndpoint = started.endpoint;
    console.log('【真机测试】已启动本地 AI 兼容服务；AI 真机测试不会访问外部厂商接口。');
  } catch (error) {
    fs.writeFileSync(rawLogPath, String(error?.stack || error));
    console.error('【真机测试】本地 AI 兼容服务启动失败；技术细节已写入日志。');
    console.error(`【真机测试】技术日志：${path.relative(process.cwd(), rawLogPath)}`);
    process.exit(1);
  }
}

console.log(`\n【真机测试】开始：${labels[suite]}`);
console.log('【真机测试】正在启动真实 Obsidian 环境。第三方运行器的英文技术日志不会直接显示在终端。');

const invocation = wdioInvocation(['run', './test/configs/wdio.conf.mts']);
if (!invocation.exists) {
  fs.writeFileSync(rawLogPath, '没有找到 WDIO，请先运行 npm ci。');
  console.error('【真机测试】没有找到 WDIO。请先运行 npm ci 安装完整依赖。');
  try { aiServer?.close(); } catch {}
  process.exit(1);
}
fs.writeFileSync(rawLogPath, '');
const cacheDir = path.resolve('.obsidian-cache');
let cacheLooksEmpty = true;
try {
  cacheLooksEmpty = !fs.existsSync(cacheDir) || fs.readdirSync(cacheDir).length === 0;
} catch {}
if (cacheLooksEmpty) {
  console.log('【真机测试】未发现 Obsidian 本地缓存；第一次运行可能需要下载 Obsidian，耗时会明显更长。');
}
console.log(`【真机测试】实时技术日志：${path.relative(process.cwd(), rawLogPath)}`);

const child = spawn(invocation.command, invocation.args, {
  stdio: ['inherit', 'pipe', 'pipe'],
  cwd: invocation.cwd,
  env: {
    ...process.env,
    ...((process.env.HTTP_PROXY || process.env.HTTPS_PROXY) && !process.env.NODE_USE_ENV_PROXY ? { NODE_USE_ENV_PROXY: '1' } : {}),
    THINK_E2E_SUITE: suite,
    THINK_E2E_RUN_ID: runId,
    ...(aiEndpoint ? { THINK_E2E_AI_ENDPOINT: aiEndpoint } : {}),
  },
  shell: false,
});

let raw = '';
let finished = false;
const childStartedAt = Date.now();
const heartbeat = setInterval(() => {
  const seconds = Math.max(1, Math.floor((Date.now() - childStartedAt) / 1000));
  console.log(`【真机测试】仍在运行，已用时 ${seconds} 秒……`);
  if (seconds >= 60 && seconds < 75) {
    console.log('【真机测试】首次运行较慢时，通常正在下载/解压 Obsidian 或启动 Electron。可另开终端运行 npm run 测试:真机:诊断 查看原始进度。');
  }
}, 10000);
heartbeat.unref?.();

const appendRaw = (chunk) => {
  const text = chunk.toString();
  raw += text;
  try { fs.appendFileSync(rawLogPath, text); } catch {}
};

const closeAiServer = () => {
  if (!aiServer) return;
  try { aiServer.close(); } catch {}
  aiServer = null;
};
const finish = (code) => {
  if (finished) return;
  finished = true;
  clearInterval(heartbeat);
  closeAiServer();
  process.exitCode = code;
};
child.stdout?.on('data', appendRaw);
child.stderr?.on('data', appendRaw);

child.on('error', (error) => {
  fs.writeFileSync(rawLogPath, raw + `\n${String(error?.stack || error)}`);
  console.error('【真机测试】无法启动真实 Obsidian 测试运行器；具体技术错误已写入日志。');
  console.error(`【真机测试】技术日志：${path.relative(process.cwd(), rawLogPath)}`);
  finish(1);
});

function writeStructuredSummary(success) {
  let cases = [];
  if (fs.existsSync(runJsonlPath)) {
    cases = fs.readFileSync(runJsonlPath, 'utf8').split(/\r?\n/).filter(Boolean).flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    });
  }
  const durationMs = Date.now() - startedAt.getTime();
  const failed = cases.filter((item) => !item.passed);
  const slowCases = [...cases].sort((a, b) => Number(b.durationMs || 0) - Number(a.durationMs || 0)).slice(0, 10);
  const summary = {
    schemaVersion: 1, kind: 'e2e', label: labels[suite], suite, runId,
    startedAt: startedAt.toISOString(), finishedAt: new Date().toISOString(), durationMs,
    success: Boolean(success),
    counts: { cases: { total: cases.length, passed: cases.length - failed.length, failed: failed.length, skipped: 0 } },
    cases, slowCases,
    artifactDir: path.relative(process.cwd(), path.join(reportDir, 'e2e-artifacts', runId)).replace(/\\/g, '/'),
  };
  fs.writeFileSync(structuredFile, JSON.stringify(summary, null, 2));
  try { recordStructuredTestRun(structuredFile, { suite, label: labels[suite] }); } catch {}
  console.log(`【真机测试】结构化结果：${path.relative(process.cwd(), structuredFile)}`);
  if (slowCases.length) {
    console.log('【真机测试】最慢用例：');
    for (const item of slowCases.slice(0, 5)) {
      const fullTitle = item.parent ? String(item.parent) + ' > ' + String(item.title) : String(item.title);
      console.log(`  - ${Number(item.durationMs || 0)}ms：${publicTestTitle(fullTitle)}`);
    }
  }
  if (failed.length) console.log(`【真机测试】失败现场目录：${summary.artifactDir}`);
}

child.on('exit', (code, signal) => {
  try { fs.writeFileSync(rawLogPath, raw); } catch {}
  if (signal) {
    writeStructuredSummary(false);
    console.error(`【真机测试】被系统信号终止：${signal}`);
    console.error(`【真机测试】技术日志：${path.relative(process.cwd(), rawLogPath)}`);
    finish(1);
    return;
  }
  if (code === 0) {
    writeStructuredSummary(true);
    console.log(`【真机测试】通过：${labels[suite]}`);
    console.log(`【真机测试】技术日志已保存：${path.relative(process.cwd(), rawLogPath)}`);
    finish(0);
    return;
  }
  writeStructuredSummary(false);
  console.error(`【真机测试】失败：${labels[suite]}，退出码 ${code ?? 1}`);
  console.error('【真机测试】请查看技术日志定位第三方运行器或断言细节。');
  console.error(`【真机测试】技术日志：${path.relative(process.cwd(), rawLogPath)}`);
  finish(code ?? 1);
});
