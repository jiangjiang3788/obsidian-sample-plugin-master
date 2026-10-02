import { normalizePath, requestUrl } from 'obsidian';

const GITHUB_OWNER = 'jiangjiang3788';
const GITHUB_REPO = 'obsidian-sample-plugin-master';
const GITHUB_BRANCH = 'main';
const DEV_BUILD_FILES = ['main.js', 'manifest.json', 'styles.css'] as const;

type DevBuildFile = (typeof DEV_BUILD_FILES)[number];

type VaultAdapterLike = {
    exists(path: string): Promise<boolean>;
    read(path: string): Promise<string>;
    write(path: string, data: string): Promise<void>;
};

export interface GitHubDevUpdateResult {
    remoteVersion: string;
    branch: string;
}

export interface GitHubDevUpdaterHost {
    app: {
        vault: {
            configDir: string;
            adapter: VaultAdapterLike;
        };
    };
    manifest: {
        id: string;
    };
}

function rawFileUrl(file: DevBuildFile, cacheBust: string): string {
    return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${file}?t=${cacheBust}`;
}

function assertDownloadedFile(file: DevBuildFile, text: string): void {
    if (!text.trim()) {
        throw new Error(`${file} 内容为空`);
    }

    if (/^\s*<(?:!doctype|html)/i.test(text)) {
        throw new Error(`${file} 返回了网页内容，而不是插件文件`);
    }

    if (file === 'main.js' && text.length < 1000) {
        throw new Error('main.js 内容异常，已停止覆盖');
    }

    if (file === 'styles.css' && text.length < 100) {
        throw new Error('styles.css 内容异常，已停止覆盖');
    }
}

function parseAndValidateManifest(text: string, expectedPluginId: string): { version: string } {
    let manifest: any;
    try {
        manifest = JSON.parse(text);
    } catch {
        throw new Error('远端 manifest.json 不是有效 JSON');
    }

    if (manifest?.id !== expectedPluginId) {
        throw new Error(`远端插件 ID 不匹配：${String(manifest?.id || 'unknown')}`);
    }

    if (manifest?.main && manifest.main !== 'main.js') {
        throw new Error(`远端 manifest main 字段异常：${String(manifest.main)}`);
    }

    if (manifest?.styles && manifest.styles !== 'styles.css') {
        throw new Error(`远端 manifest styles 字段异常：${String(manifest.styles)}`);
    }

    return {
        version: typeof manifest?.version === 'string' && manifest.version.trim()
            ? manifest.version.trim()
            : '未标版本',
    };
}

async function downloadDevBuild(): Promise<Record<DevBuildFile, string>> {
    const cacheBust = `${Date.now()}`;
    const entries = await Promise.all(
        DEV_BUILD_FILES.map(async (file) => {
            const response = await requestUrl({ url: rawFileUrl(file, cacheBust) });
            if (response.status !== 200) {
                throw new Error(`下载 ${file} 失败（HTTP ${response.status}）`);
            }
            assertDownloadedFile(file, response.text);
            return [file, response.text] as const;
        }),
    );

    return Object.fromEntries(entries) as Record<DevBuildFile, string>;
}

async function readBackups(adapter: VaultAdapterLike, pluginDir: string): Promise<Record<DevBuildFile, string | null>> {
    const entries = await Promise.all(
        DEV_BUILD_FILES.map(async (file) => {
            const path = `${pluginDir}/${file}`;
            const exists = await adapter.exists(path);
            return [file, exists ? await adapter.read(path) : null] as const;
        }),
    );
    return Object.fromEntries(entries) as Record<DevBuildFile, string | null>;
}

async function rollbackFiles(
    adapter: VaultAdapterLike,
    pluginDir: string,
    backups: Record<DevBuildFile, string | null>,
    writtenFiles: DevBuildFile[],
): Promise<void> {
    for (const file of [...writtenFiles].reverse()) {
        const previous = backups[file];
        if (previous === null) continue;
        try {
            await adapter.write(`${pluginDir}/${file}`, previous);
        } catch {
            // Best effort only. Preserve the original write error for the caller.
        }
    }
}

/**
 * Pull the current development build from GitHub main into this plugin's folder.
 * All remote files are downloaded and validated before any local file is changed.
 * If a write fails, already-written files are restored on a best-effort basis.
 */
export async function pullGitHubDevBuild(host: GitHubDevUpdaterHost): Promise<GitHubDevUpdateResult> {
    const downloaded = await downloadDevBuild();
    const remoteManifest = parseAndValidateManifest(downloaded['manifest.json'], host.manifest.id);
    const pluginDir = normalizePath(`${host.app.vault.configDir}/plugins/${host.manifest.id}`);
    const adapter = host.app.vault.adapter;
    const backups = await readBackups(adapter, pluginDir);
    const writtenFiles: DevBuildFile[] = [];

    try {
        // Write manifest last so an interrupted update is less likely to advertise a build
        // whose JavaScript/CSS did not finish writing.
        const writeOrder: DevBuildFile[] = ['main.js', 'styles.css', 'manifest.json'];
        for (const file of writeOrder) {
            await adapter.write(`${pluginDir}/${file}`, downloaded[file]);
            writtenFiles.push(file);
        }
    } catch (error) {
        await rollbackFiles(adapter, pluginDir, backups, writtenFiles);
        throw error;
    }

    return {
        remoteVersion: remoteManifest.version,
        branch: GITHUB_BRANCH,
    };
}
