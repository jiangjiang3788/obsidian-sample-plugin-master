const fs = require('node:fs');
const path = require('node:path');

function rel(root, file) {
  try { return path.relative(root, file).replace(/\\/g, '/'); } catch { return String(file); }
}

function stripAnsi(value) {
  return String(value || '').replace(/\u001b\[[0-9;]*m/g, '');
}

function displayValue(value) {
  if (typeof value === 'string') return value.length > 300 ? `${value.slice(0, 300)}…` : value;
  try {
    const text = JSON.stringify(value);
    if (text !== undefined) return text.length > 300 ? `${text.slice(0, 300)}…` : text;
  } catch {}
  return String(value);
}

function assertionValues(assertion) {
  for (const detail of assertion.failureDetails || []) {
    const matcher = detail && detail.matcherResult;
    if (!matcher) continue;
    const rows = [];
    if (Object.prototype.hasOwnProperty.call(matcher, 'expected')) rows.push(`    【期望】${displayValue(matcher.expected)}`);
    if (Object.prototype.hasOwnProperty.call(matcher, 'actual')) rows.push(`    【实际】${displayValue(matcher.actual)}`);
    if (rows.length) return rows;
  }

  const raw = stripAnsi((assertion.failureMessages || []).join('\n'));
  const rows = [];
  const expected = raw.match(/^\s*Expected(?:\s+[^:]+)?:\s*(.+)$/mi);
  const received = raw.match(/^\s*Received(?:\s+[^:]+)?:\s*(.+)$/mi);
  if (expected) rows.push(`    【期望】${expected[1].trim()}`);
  if (received) rows.push(`    【实际】${received[1].trim()}`);
  return rows;
}

function publicTitle(value) {
  const text = String(value || '').trim();
  if (!text) return '未命名用例';
  return /[\u3400-\u9fff]/.test(text) ? text : '未中文命名的源码用例';
}

function isoNow() {
  return new Date().toISOString();
}

class ChineseJestReporter {
  constructor(globalConfig) {
    this.rootDir = globalConfig.rootDir || process.cwd();
    this.failed = [];
    const configArgIndex = process.argv.indexOf('--config');
    const configArg = configArgIndex >= 0 ? String(process.argv[configArgIndex + 1] || '') : '';
    const configName = path.basename(configArg);
    const labelByConfig = {
      'jest.unit.config.js': '单元测试',
      'jest.integration.config.js': '组合测试',
      'jest.coverage.config.js': '覆盖率测试',
      'jest.performance.config.js': '性能基线测试',
      'jest.core.config.js': '日常测试',
      'jest.config.js': 'Jest 测试',
    };
    this.label = process.env.THINK_TEST_LABEL || labelByConfig[configName] || 'Jest 测试';
    const safeLabel = this.label.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || 'jest';
    const defaultReportDir = path.resolve(this.rootDir, 'reports/testing');
    this.reportFile = process.env.THINK_JEST_REPORT_FILE || '';
    this.failureFile = process.env.THINK_JEST_FAILURE_FILE || path.join(defaultReportDir, `${safeLabel}-失败技术日志.txt`);
    this.structuredFile = process.env.THINK_JEST_STRUCTURED_FILE || path.join(defaultReportDir, `${safeLabel}-结构化结果.json`);
    this.startedAt = Date.now();
    this.startedAtIso = isoNow();
    this.files = [];
    this.cases = [];
    for (const file of [this.reportFile, this.failureFile, this.structuredFile]) {
      if (!file) continue;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      if (file !== this.structuredFile) fs.writeFileSync(file, '');
    }
  }

  write(line = '', isError = false) {
    if (this.reportFile) {
      fs.appendFileSync(this.reportFile, `${line}\n`);
      return;
    }
    (isError ? console.error : console.log)(line);
  }

  saveRawFailure(file, index, assertion) {
    if (!this.failureFile) return;
    const title = [...(assertion.ancestorTitles || []), assertion.title || ''].filter(Boolean).join(' > ');
    const raw = (assertion.failureMessages || []).join('\n');
    fs.appendFileSync(this.failureFile, `\n===== ${file} / ${index} =====\n${title}\n${raw}\n`);
  }

  onRunStart(results) {
    this.write(`\n【测试】开始执行，共发现 ${results.numTotalTestSuites || 0} 个测试文件。`);
  }

  onTestResult(test, result) {
    const file = rel(this.rootDir, test.path);
    const passed = result.numPassingTests || 0;
    const failed = result.numFailingTests || 0;
    const pending = result.numPendingTests || 0;
    const suiteError = result.testExecError
      || ((passed === 0 && failed === 0 && result.failureMessage) ? { message: result.failureMessage } : null);
    const suiteFailed = failed > 0 || Boolean(suiteError);
    const status = suiteFailed ? '失败' : '通过';
    const fileDurationMs = Math.max(0, Number(result.perfStats?.end || 0) - Number(result.perfStats?.start || 0));
    this.files.push({ file, status, passed, failed, pending, durationMs: fileDurationMs, suiteError: Boolean(suiteError) });
    this.write(`【测试文件】${status}：${file}（通过 ${passed}，失败 ${failed}，跳过 ${pending}，耗时 ${fileDurationMs}ms）`, suiteFailed);

    if (suiteError) {
      this.write('  【套件错误】测试文件在执行具体用例前发生运行错误；详细堆栈已写入技术失败日志。', true);
      if (this.failureFile) {
        const raw = stripAnsi(suiteError.stack || suiteError.message || String(suiteError));
        fs.appendFileSync(this.failureFile, `\n===== ${file} / 套件级错误 =====\n${raw}\n`);
      }
    }

    if (Array.isArray(result.console)) {
      for (const entry of result.console) {
        const message = stripAnsi(entry?.message || '').trim();
        if (message && /[\u3400-\u9fff]/.test(message)) this.write(`  【测试信息】${message}`);
      }
    }

    let failureIndex = 0;
    for (const assertion of result.testResults || []) {
      const title = [...(assertion.ancestorTitles || []), assertion.title || ''].filter(Boolean).join(' > ');
      const durationMs = Number.isFinite(assertion.duration) ? Number(assertion.duration) : null;
      this.cases.push({
        id: `${file}::${title}`,
        file,
        title,
        status: assertion.status === 'passed' ? '通过' : assertion.status === 'failed' ? '失败' : '跳过',
        durationMs,
      });
      if (assertion.status !== 'failed') continue;
      failureIndex += 1;
      const location = assertion.location
        ? `第 ${assertion.location.line} 行，第 ${assertion.location.column} 列`
        : '请按失败文件定位';
      this.write(`  【失败用例 ${failureIndex}】${publicTitle(title)}（${location}）`, true);
      this.write('    【失败原因】断言或运行时行为未满足预期；第三方英文诊断已隐藏。', true);
      for (const row of assertionValues(assertion)) this.write(row, true);
      this.saveRawFailure(file, failureIndex, assertion);
    }
    if (suiteFailed) this.failed.push(file);
  }

  onRunComplete(_contexts, results) {
    const durationMs = Date.now() - this.startedAt;
    const slowCases = this.cases
      .filter((item) => Number.isFinite(item.durationMs))
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 10);

    const success = Number(results.numFailedTestSuites || 0) === 0
      && Number(results.numFailedTests || 0) === 0
      && Number(results.numRuntimeErrorTestSuites || 0) === 0
      && results.wasInterrupted !== true;

    this.write('\n【测试汇总】');
    this.write(`- 测试文件：${results.numTotalTestSuites}，通过 ${results.numPassedTestSuites}，失败 ${results.numFailedTestSuites}，待处理 ${results.numPendingTestSuites}`);
    this.write(`- 测试用例：${results.numTotalTests}，通过 ${results.numPassedTests}，失败 ${results.numFailedTests}，跳过 ${results.numPendingTests}`);
    this.write(`- 总耗时：${durationMs}ms`);
    this.write(`- 执行结果：${success ? '全部通过' : '存在失败'}`, !success);
    if (slowCases.length) {
      this.write('- 最慢用例：');
      for (const item of slowCases.slice(0, 5)) this.write(`  - ${item.durationMs}ms：${publicTitle(item.title)}（${item.file}）`);
    }
    if (this.failed.length) this.write(`- 失败文件：${this.failed.join('、')}`, true);
    if (this.failureFile && this.failed.length) this.write(`- 技术失败日志：${rel(this.rootDir, this.failureFile)}`);

    if (this.structuredFile) {
      const structured = {
        schemaVersion: 1,
        kind: 'jest',
        label: this.label,
        startedAt: this.startedAtIso,
        finishedAt: isoNow(),
        durationMs,
        success,
        counts: {
          files: { total: results.numTotalTestSuites, passed: results.numPassedTestSuites, failed: results.numFailedTestSuites, skipped: results.numPendingTestSuites },
          cases: { total: results.numTotalTests, passed: results.numPassedTests, failed: results.numFailedTests, skipped: results.numPendingTests },
        },
        files: this.files,
        cases: this.cases,
        slowCases,
      };
      fs.writeFileSync(this.structuredFile, JSON.stringify(structured, null, 2));
    }
  }
}

module.exports = ChineseJestReporter;
