/**
 * @covers GitHubDevUpdater/unit
 */
import { requestUrl } from 'obsidian';
import { pullGitHubDevBuild } from '@/platform/obsidian/GitHubDevUpdater';

const requestUrlMock = requestUrl as jest.MockedFunction<typeof requestUrl>;

function makeHost() {
    const files: Record<string, string> = {
        '.obsidian/plugins/think-os/main.js': 'old-main',
        '.obsidian/plugins/think-os/manifest.json': '{"id":"think-os","version":"1.0.0"}',
        '.obsidian/plugins/think-os/styles.css': 'old-css',
    };
    const write = jest.fn(async (path: string, data: string) => {
        files[path] = data;
    });
    const adapter = {
        exists: jest.fn(async (path: string) => Object.prototype.hasOwnProperty.call(files, path)),
        read: jest.fn(async (path: string) => files[path]),
        write,
    };
    return {
        files,
        write,
        host: {
            app: { vault: { configDir: '.obsidian', adapter } },
            manifest: { id: 'think-os' },
        },
    };
}

function successfulResponses() {
    const main = `/* build */\n${'x'.repeat(1200)}`;
    const manifest = JSON.stringify({
        id: 'think-os',
        version: '1.18.1',
        main: 'main.js',
        styles: 'styles.css',
    });
    const css = `.think-os { display: block; }\n${' '.repeat(120)}`;

    requestUrlMock.mockImplementation(async (options: any) => {
        const url = String(options?.url || '');
        if (url.includes('/main.js?')) return { status: 200, text: main, headers: {}, json: {} } as any;
        if (url.includes('/manifest.json?')) return { status: 200, text: manifest, headers: {}, json: {} } as any;
        if (url.includes('/styles.css?')) return { status: 200, text: css, headers: {}, json: {} } as any;
        return { status: 404, text: '', headers: {}, json: {} } as any;
    });

    return { main, manifest, css };
}

describe('GitHubDevUpdater', () => {
    beforeEach(() => requestUrlMock.mockReset());

    it('downloads and validates all three files before replacing the local build', async () => {
        const expected = successfulResponses();
        const { host, files, write } = makeHost();

        await expect(pullGitHubDevBuild(host)).resolves.toEqual({
            remoteVersion: '1.18.1',
            branch: 'main',
        });

        expect(requestUrlMock).toHaveBeenCalledTimes(3);
        expect(write).toHaveBeenCalledTimes(3);
        expect(files['.obsidian/plugins/think-os/main.js']).toBe(expected.main);
        expect(files['.obsidian/plugins/think-os/styles.css']).toBe(expected.css);
        expect(files['.obsidian/plugins/think-os/manifest.json']).toBe(expected.manifest);
        expect(write.mock.calls.map(([path]) => path)).toEqual([
            '.obsidian/plugins/think-os/main.js',
            '.obsidian/plugins/think-os/styles.css',
            '.obsidian/plugins/think-os/manifest.json',
        ]);
    });

    it('does not touch local plugin files when a download fails', async () => {
        successfulResponses();
        requestUrlMock.mockImplementation(async (options: any) => {
            const url = String(options?.url || '');
            if (url.includes('/styles.css?')) return { status: 503, text: '', headers: {}, json: {} } as any;
            if (url.includes('/manifest.json?')) {
                return { status: 200, text: '{"id":"think-os","version":"1.18.1"}', headers: {}, json: {} } as any;
            }
            return { status: 200, text: `/* build */${'x'.repeat(1200)}`, headers: {}, json: {} } as any;
        });
        const { host, write } = makeHost();

        await expect(pullGitHubDevBuild(host)).rejects.toThrow('下载 styles.css 失败');
        expect(write).not.toHaveBeenCalled();
    });

    it('rolls back files already written when a later write fails', async () => {
        successfulResponses();
        const { host, files, write } = makeHost();
        let failed = false;
        write.mockImplementation(async (path: string, data: string) => {
            if (!failed && path.endsWith('/styles.css')) {
                failed = true;
                throw new Error('disk full');
            }
            files[path] = data;
        });

        await expect(pullGitHubDevBuild(host)).rejects.toThrow('disk full');
        expect(files['.obsidian/plugins/think-os/main.js']).toBe('old-main');
        expect(files['.obsidian/plugins/think-os/styles.css']).toBe('old-css');
        expect(files['.obsidian/plugins/think-os/manifest.json']).toContain('1.0.0');
    });
});
