// wdio.conf.ts
import type { Options } from '@wdio/types';
import path from 'node:path';

export const config: Options.Testrunner = {
    runner: 'local',
    autoCompileOpts: {
        autoCompile: true,
        tsNodeOpts: {
            project: './tsconfig.json',
            transpileOnly: true,
        },
    },
    specs: ['./e2e/**/*.spec.ts'],
    maxInstances: 1,

    // ==================
    // Capabilities (v9 风格)
    // ==================
    // 这里是关键！v9 不再需要 wdio-chromedriver-service。
    // WebdriverIO 会自动下载和管理与你的 Chrome/Electron 版本匹配的 driver。
    capabilities: [
        {
            browserName: 'chrome',
            'goog:chromeOptions': {
                // 如果需要，可以在这里添加 chrome 选项
            },
        },
    ],

    logLevel: 'info',
    bail: 0,
    baseUrl: 'http://localhost',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,

    // ===================
    // Service Definitons
    // ===================
    // 确保这里没有 'chromedriver'
    services: [
        [
            'obsidian',
            {
                vaultPath: path.resolve('G:/vikahz'),
            },
        ],
    ],

    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000,
    },
    reporters: ['spec'],
};