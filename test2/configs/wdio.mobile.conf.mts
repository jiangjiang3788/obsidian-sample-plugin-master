import * as path from "path"
import { parseObsidianVersions } from "wdio-obsidian-service";
import { env } from "process";

// 使用此 wdio 配置来针对真实的 Obsidian Android 应用进行测试。
// 要启用此功能，请将 `"test:android": "wdio run ./wdio.mobile.conf.mts"` 添加到 package.json 文件中。
// 你需要先设置好 Android Studio 和 Appium 才能使其正常工作，详情请参阅
// https://jesse-r-s-hines.github.io/wdio-obsidian-service/wdio-obsidian-service/README#android
// 如果你的插件是“仅限桌面”的（isDesktopOnly），或者你只想使用桌面的“移动端模拟”（emulateMobile）模式进行测试，那么直接删除此文件即可。

const cacheDir = path.resolve(".obsidian-cache");

// 选择要测试的 Obsidian 版本
// 注意：Android 应用没有 beta 测试版本
let defaultVersions = "latest/latest";
const versions = await parseObsidianVersions(
    env.OBSIDIAN_MOBILE_VERSIONS ?? env.OBSIDIAN_VERSIONS ?? defaultVersions,
    {cacheDir},
);
if (env.CI) {
    console.log("obsidian-cache-key:", JSON.stringify(versions));
}

export const config: WebdriverIO.Config = {
    runner: 'local',
    framework: 'mocha',

    specs: ['./test/specs/**/*.e2e.ts'],

    maxInstances: 1, // 在 Appium 下并行测试不起作用
    hostname: env.APPIUM_HOST || 'localhost',
    port: parseInt(env.APPIUM_PORT || "4723"),

    // （installerVersion 与移动端应用无关）
    capabilities: versions.map<WebdriverIO.Capabilities>(([appVersion]) => ({
        browserName: "obsidian",
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:avd': "obsidian_test", // 安卓虚拟设备的名称
        'appium:enforceAppInstall': true,
        'appium:adbExecTimeout': 60 * 1000,
        'wdio:obsidianOptions': {
            appVersion: appVersion,
            plugins: ["."],
            vault: "test/vaults/simple", // 测试用的库
        },
    })),

    services: [
        "obsidian",
        ["appium", {
            args: { allowInsecure: "chromedriver_autodownload,adb_shell" },
        }],
    ],
    reporters: ["obsidian"],

    mochaOpts: {
        ui: 'bdd',
        timeout: 60 * 1000,
    },
    waitforInterval: 250,
    waitforTimeout: 5 * 1000,
    logLevel: "warn",

    cacheDir: cacheDir,
}