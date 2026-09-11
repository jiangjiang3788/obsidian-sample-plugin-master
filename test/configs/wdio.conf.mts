import * as path from "path"
import * as fs from "fs"
import { fileURLToPath } from "url"
import { parseObsidianVersions } from "wdio-obsidian-service";
import { env } from "process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const cacheDir = path.resolve(rootDir, ".obsidian-cache");
const runId = String(env.THINK_E2E_RUN_ID || `e2e-${Date.now()}`).replace(/[^A-Za-z0-9_.-]+/g, '-');
const e2eReportDir = path.resolve(rootDir, 'reports/testing/e2e-results', runId);
const e2eArtifactDir = path.resolve(rootDir, 'reports/testing/e2e-artifacts', runId);
const e2eJsonl = path.resolve(e2eReportDir, '用例结果.jsonl');

function safeFileName(value: string): string {
    return String(value || '未命名用例').replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || '未命名用例';
}

function appendE2eResult(value: Record<string, unknown>) {
    fs.mkdirSync(e2eReportDir, { recursive: true });
    fs.appendFileSync(e2eJsonl, `${JSON.stringify(value)}\n`);
}


const desktopVersions = await parseObsidianVersions(
    env.OBSIDIAN_VERSIONS?.trim() || "latest/latest",
    { cacheDir },
);

if (env.CI) {
    console.log("Obsidian 缓存键：", JSON.stringify([desktopVersions]));
}

const suite = String(env.THINK_E2E_SUITE || 'all').trim().toLowerCase();
const suiteSpecs: Record<string, string[]> = {
    smoke: [
        path.resolve(rootDir, 'test/specs/smoke.e2e.ts'),
        path.resolve(rootDir, 'test/specs/plugin-lifecycle.e2e.ts'),
    ],
    ui: [
        path.resolve(rootDir, 'test/specs/settings-goal.e2e.ts'),
        path.resolve(rootDir, 'test/specs/quick-input-task.e2e.ts'),
        path.resolve(rootDir, 'test/specs/edit-recovery-timer-ui.e2e.ts'),
    ],
    runtime: [
        path.resolve(rootDir, 'test/specs/vault-index.e2e.ts'),
        path.resolve(rootDir, 'test/specs/timer-runtime.e2e.ts'),
        path.resolve(rootDir, 'test/specs/record-mutation.e2e.ts'),
        path.resolve(rootDir, 'test/specs/energy-runtime.e2e.ts'),
        path.resolve(rootDir, 'test/specs/recurrence-runtime.e2e.ts'),
    ],
    p1: [
        path.resolve(rootDir, 'test/specs/ai-chat-store-runtime.e2e.ts'),
        path.resolve(rootDir, 'test/specs/ai-chat-ui.e2e.ts'),
        path.resolve(rootDir, 'test/specs/settings-p1.e2e.ts'),
        path.resolve(rootDir, 'test/specs/goal-template-fields.e2e.ts'),
        path.resolve(rootDir, 'test/specs/energy-quick-capture-ui.e2e.ts'),
        path.resolve(rootDir, 'test/specs/energy-view-task.e2e.ts'),
        path.resolve(rootDir, 'test/specs/ai-natural-input.e2e.ts'),
        path.resolve(rootDir, 'test/specs/layout-editor-module-settings.e2e.ts'),
        path.resolve(rootDir, 'test/specs/views-matrix.e2e.ts'),
        path.resolve(rootDir, 'test/specs/whiteboard.e2e.ts'),
    ],
    ai: [
        path.resolve(rootDir, 'test/specs/ai-natural-input.e2e.ts'),
        path.resolve(rootDir, 'test/specs/ai-speed-test.e2e.ts'),
    ],
    p2: [
        path.resolve(rootDir, 'test/specs/ai-speed-test.e2e.ts'),
        path.resolve(rootDir, 'test/specs/energy-settings.e2e.ts'),
        path.resolve(rootDir, 'test/specs/mobile-profile.e2e.ts'),
    ],
    scale: [
        path.resolve(rootDir, 'test/specs/large-vault.e2e.ts'),
    ],
    compat: [
        path.resolve(rootDir, 'test/specs/compatibility-matrix.e2e.ts'),
    ],
};
suiteSpecs.p0 = [...suiteSpecs.smoke, ...suiteSpecs.ui, ...suiteSpecs.runtime];
suiteSpecs.all = [path.resolve(rootDir, 'test/specs/**/*.e2e.ts')];

export const config: WebdriverIO.Config = {
    runner: 'local',
    framework: 'mocha',

    specs: suiteSpecs[suite] || suiteSpecs.all,

    maxInstances: Number(env.WDIO_MAX_INSTANCES || 1),

    capabilities: [
        ...desktopVersions.map<WebdriverIO.Capabilities>(([appVersion, installerVersion]) => ({
            browserName: 'obsidian',
            'wdio:obsidianOptions': {
                appVersion, installerVersion,
                plugins: [rootDir],
                vault: path.resolve(rootDir, "test/vaults/simple"),
            },
        })),
    ],

    services: ["obsidian"],
    reporters: ['obsidian'],

    mochaOpts: {
        ui: 'bdd',
        timeout: (suite === 'scale' ? 180 : 90) * 1000,
    },
    waitforInterval: 250,
    waitforTimeout: 5 * 1000,
    logLevel: "warn",

    cacheDir: cacheDir,

    onPrepare: async () => {
        fs.mkdirSync(e2eReportDir, { recursive: true });
        fs.mkdirSync(e2eArtifactDir, { recursive: true });
        fs.writeFileSync(e2eJsonl, '');
    },

    afterTest: async (test, _context, result) => {
        const durationMs = Number(result?.duration || 0);
        const passed = Boolean(result?.passed);
        const title = String(test?.title || '未命名用例');
        const parent = String(test?.parent || '');
        const browserLike = (globalThis as any).browser;
        let screenshot: string | null = null;
        let pageSource: string | null = null;
        let failureSummary: string | null = null;

        if (!passed) {
            const base = `${Date.now()}-${safeFileName(`${parent}-${title}`)}`;
            fs.mkdirSync(e2eArtifactDir, { recursive: true });
            if (browserLike?.saveScreenshot) {
                try {
                    screenshot = path.resolve(e2eArtifactDir, `${base}.png`);
                    await browserLike.saveScreenshot(screenshot);
                } catch {}
            }
            if (browserLike?.getPageSource) {
                try {
                    pageSource = path.resolve(e2eArtifactDir, `${base}-页面现场.html`);
                    fs.writeFileSync(pageSource, await browserLike.getPageSource());
                } catch {}
            }
            failureSummary = path.resolve(e2eArtifactDir, `${base}-失败摘要.json`);
            fs.writeFileSync(failureSummary, JSON.stringify({
                title, parent, durationMs,
                error: result?.error ? String((result.error as any)?.stack || (result.error as any)?.message || result.error) : null,
                screenshot: screenshot ? path.relative(rootDir, screenshot).replace(/\\/g, '/') : null,
                pageSource: pageSource ? path.relative(rootDir, pageSource).replace(/\\/g, '/') : null,
            }, null, 2));
        }

        appendE2eResult({
            schemaVersion: 1,
            suite, runId,
            title, parent,
            id: `${parent} > ${title}`,
            status: passed ? '通过' : '失败',
            passed,
            durationMs,
            retries: Number((result as any)?.retries || 0),
            obsidianVersion: String(browserLike?.capabilities?.browserVersion || browserLike?.capabilities?.version || 'unknown'),
            screenshot: screenshot ? path.relative(rootDir, screenshot).replace(/\\/g, '/') : null,
            pageSource: pageSource ? path.relative(rootDir, pageSource).replace(/\\/g, '/') : null,
            failureSummary: failureSummary ? path.relative(rootDir, failureSummary).replace(/\\/g, '/') : null,
            recordedAt: new Date().toISOString(),
        });
    },
}
