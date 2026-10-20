'use strict';
/** Smoke-test REAL offline-bundled JS (not just its TS source). Run after
 * scripts/build/sync-offline-system-bundle.cjs. No Jest / Vite deps needed. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const js = fs.readFileSync(path.resolve(__dirname, '../../main.js'), 'utf8');
function fragment(from, until) {
  const start = js.indexOf(from), end = js.indexOf(until, start);
  assert(start >= 0 && end > start, `compiled bundle section missing: ${from} -> ${until}`);
  return js.slice(start, end);
}
const sha = '1'.repeat(40);
const pushed = '2026-10-14T04:18:00Z', committed = '2026-10-14T04:10:00Z';
const payloads = {
  'main.js': '// main compiled\n' + 'a'.repeat(2000),
  'styles.css': '.timeline { display: block; }' + 'b'.repeat(200),
  'manifest.json': JSON.stringify({ id: 'think-os', version: '1.18.2', main: 'main.js', styles: 'styles.css' }),
};
const net = [];
let interrupt = false;
const files = {};
for (const [file, body] of Object.entries(payloads)) files[`.obsidian/plugins/think-os/${file}`] = `old-${file}`;
const obsidian = {
  normalizePath: (str) => str,
  requestUrl: async ({ url }) => {
    net.push(url);
    if (url.includes('/commits/main')) return { status: 200, json: { sha, commit: { committer: { date: committed } } } };
    if (url.includes('/events?')) return { status: 200, json: [{ type:'PushEvent', created_at: pushed, payload: { ref: 'refs/heads/main', head: sha } }] };
    for (const [file, body] of Object.entries(payloads)) {
      if (url.includes(`/${sha}/${file}?`)) return { status: 200, text: body };
    }
    throw new Error('unexpected network URL: ' + url);
  },
};
const ctx = vm.createContext({ obsidian, console, Date, setTimeout, clearTimeout });
vm.runInContext(fragment('const GITHUB_OWNER =', 'const THINK_SETTINGS_VIEW_TYPE =') + '\n'
  + 'this.githubInfo=getGitHubDevBuildInfo; this.pull=pullGitHubDevBuild;', ctx, { filename:'bundled-updater.js' });
const host = { manifest: { id: 'think-os' }, app: { vault: { configDir: '.obsidian', adapter: {
  exists: async (p) => p in files, read: async (p) => files[p],
  write: async (p, data) => { files[p] = data; if (interrupt && p.endsWith('styles.css')) { interrupt=false; throw Error('interrupted'); } },
  remove: async (p) => { delete files[p]; },
} } } };
const rulerJs = fragment('const TIMELINE_KEY_HOURS =', 'function useTimelineDensityMode(');
const rulerCtx = vm.createContext({
  u2: (type, props, ...children) => ({ type, props, children }),
});
// The renderer's local code includes the time scale and TimeRulerGrid JSX.
// Extract just its two declarations to avoid bringing unrelated app modules.
const gridFn = rulerJs.slice(rulerJs.indexOf('function TimeRulerGrid('));
const nextFnAt = gridFn.indexOf('\nfunction ' , 2);
assert(nextFnAt > 0, 'TimeRulerGrid boundary missing');
vm.runInContext('const TIMELINE_KEY_HOURS=[3,6,9,12];\n'
  + 'function timelineKeyHour(minute){const hour=minute/60;return TIMELINE_KEY_HOURS.find(h=>h===hour)??null;}\n'
  + gridFn.slice(0,nextFnAt) + '\nthis.renderGrid=TimeRulerGrid;', rulerCtx);
const grid = rulerCtx.renderGrid({
  ticks: [3,6,9,12].map(h => ({ minute:h*60, offset:h*30, level:'hour', strokeWidth:1, strokeOpacity:0.8, showInGrid:true })),
  height: 800, variant: 'grid',
});
const nodes = (grid.props.children || []).filter(Boolean);
for(const h of [3,6,9,12]) assert(nodes.some(node => String(node.props?.className).includes(`--key-${h}`)),`real bundled ruler lacks ${h}`);
console.log('PASS real bundle TimeRulerGrid renders four semantic key-hour colors');
(async () => {
  const preview = await ctx.githubInfo('think-os');
  assert.equal(preview.remoteVersion, '1.18.2');
  assert.equal(preview.githubPushedAt, '2026-10-14T04:18:00.000Z');
  assert.equal(preview.githubCommitAt, '2026-10-14T04:10:00.000Z');
  await ctx.pull(host, preview);
  assert.equal(files['.obsidian/plugins/think-os/main.js'], payloads['main.js']);
  assert(net.filter(u=>u.includes('raw.githubusercontent.com')).every(u=>u.includes(`/${sha}/`)));
  console.log('PASS real bundled GitHub updater previews SHA/push time and installs one immutable version');
  interrupt = true;
  await assert.rejects(ctx.pull(host, preview), /已回滚到原版本/);
  assert.equal(files['.obsidian/plugins/think-os/main.js'], payloads['main.js']);
  assert.equal(files['.obsidian/plugins/think-os/styles.css'], payloads['styles.css']);
  console.log('PASS real bundled GitHub updater rolls back after partial filesystem writes');
})().catch((e) => { console.error(e); process.exitCode=1; });
