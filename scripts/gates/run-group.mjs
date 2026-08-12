import { spawnSync } from 'node:child_process';
import path from 'node:path';

export function runGateGroup(group, checks) {
  const root = process.cwd();
  console.log('\n[gate:' + group + '] ' + checks.length + ' checks');
  for (const check of checks) {
    const file = path.join(root, 'scripts/gates/checks', check);
    const result = spawnSync(process.execPath, [file], { cwd: root, stdio: 'inherit', env: process.env });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      console.error('[gate:' + group + '] FAILED: ' + check);
      process.exit(result.status ?? 1);
    }
  }
  console.log('[gate:' + group + '] PASS');
}
