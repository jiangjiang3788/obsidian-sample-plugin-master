import * as path from "path"
import { fileURLToPath } from "url"
import { parseObsidianVersions } from "wdio-obsidian-service";
import { env } from "process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const cacheDir = path.resolve(rootDir, ".obsidian-cache");

const desktopVersions = await parseObsidianVersions(
    "latest/latest",
    { cacheDir },
);

if (env.CI) {
    console.log("obsidian-cache-key:", JSON.stringify([desktopVersions]));
}

export const config: WebdriverIO.Config = {
    runner: 'local',
    framework: 'mocha',

    specs: [path.resolve(rootDir, 'test/specs/**/*.e2e.ts')],

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
        timeout: 60 * 1000,
    },
    waitforInterval: 250,
    waitforTimeout: 5 * 1000,
    logLevel: "warn",

    cacheDir: cacheDir,
}
