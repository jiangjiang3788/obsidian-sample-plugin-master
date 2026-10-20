/** @covers GitHubDevUpdater/unit */
import { requestUrl } from 'obsidian';
import {
  getGitHubDevBuildInfo, pullGitHubDevBuild, findGitHubRevisionPushTime,
} from '@/platform/obsidian/GitHubDevUpdater';

const requestUrlMock = requestUrl as jest.MockedFunction<typeof requestUrl>;
const sha = 'a'.repeat(40);
const committedAt = '2026-10-14T03:12:00.000Z';
const pushedAt = '2026-10-14T03:17:00.000Z';
const contents = {
  'main.js': `/* build */\n${'x'.repeat(1200)}`,
  'styles.css': `.think-os { display: block; }\n${' '.repeat(120)}`,
  'manifest.json': JSON.stringify({ id: 'think-os', version: '1.18.2', main: 'main.js', styles: 'styles.css' }),
};
const preview = {
  remoteVersion: '1.18.2', branch: 'main', githubPushedAt: pushedAt,
  githubCommitAt: committedAt, commitSha: sha,
};

function makeHost() {
  const files: Record<string, string> = {
    '.obsidian/plugins/think-os/main.js': 'old-main',
    '.obsidian/plugins/think-os/manifest.json': '{"id":"think-os","version":"1.0.0"}',
    '.obsidian/plugins/think-os/styles.css': 'old-css',
  };
  const write = jest.fn(async (path: string, data: string) => { files[path] = data; });
  const adapter = {
    exists: jest.fn(async (path: string) => Object.prototype.hasOwnProperty.call(files, path)),
    read: jest.fn(async (path: string) => files[path]),
    write,
    remove: jest.fn(async (path: string) => { delete files[path]; }),
  };
  return { files, write, adapter, host: { app: { vault: { configDir: '.obsidian', adapter } }, manifest: { id: 'think-os' } } };
}

function mockGitHub(input: { failHead?: boolean; failCss?: boolean; events?: unknown } = {}) {
  requestUrlMock.mockImplementation(async (options: any) => {
    const url = String(options?.url || '');
    if (url.includes('/commits/main')) {
      return { status: input.failHead ? 403 : 200, json: { sha, commit: { committer: { date: committedAt } } } } as any;
    }
    if (url.includes('/events?')) {
      return { status: 200, json: input.events ?? [{
        type: 'PushEvent', created_at: pushedAt,
        payload: { ref: 'refs/heads/main', head: sha },
      }] } as any;
    }
    for (const [file, content] of Object.entries(contents)) {
      if (url.includes(`/${sha}/${file}?`)) {
        return { status: input.failCss && file === 'styles.css' ? 503 : 200, text: content } as any;
      }
    }
    return { status: 404, text: '' } as any;
  });
}

describe('GitHubDevUpdater pinned transactional updates', () => {
  beforeEach(() => requestUrlMock.mockReset());

  it('matches exact GitHub PushEvent SHA+branch, never labels commit time as upload time', () => {
    expect(findGitHubRevisionPushTime([
      { type: 'PushEvent', created_at: pushedAt, payload: { ref: 'refs/heads/main', head: 'b'.repeat(40) } },
      { type: 'PushEvent', created_at: pushedAt, payload: { ref: 'refs/heads/test', head: sha } },
    ], sha)).toBeNull();
    expect(findGitHubRevisionPushTime([
      { type: 'PushEvent', created_at: pushedAt, payload: { ref: 'refs/heads/main', head: sha } },
    ], sha)).toBe(pushedAt);
  });

  it('previews GitHub push/commit timestamps and downloads all files at the current main SHA', async () => {
    mockGitHub();
    await expect(getGitHubDevBuildInfo('think-os')).resolves.toEqual(preview);
    const { host, write, files } = makeHost();
    await expect(pullGitHubDevBuild(host, preview)).resolves.toEqual(preview);
    expect(requestUrlMock.mock.calls.filter(([arg]: any[]) => String(arg.url).includes('raw.githubusercontent'))
      .every(([arg]: any[]) => String(arg.url).includes(`/${sha}/`))).toBe(true);
    expect(write.mock.calls.map(([path]) => path.split('/').pop())).toEqual(['main.js', 'styles.css', 'manifest.json']);
    for (const file of ['main.js', 'styles.css', 'manifest.json'] as const) {
      expect(files[`.obsidian/plugins/think-os/${file}`]).toBe(contents[file]);
    }
  });

  it('ignores a stale preview and re-reads main SHA when downloading', async () => {
    mockGitHub();
    const { host } = makeHost();
    const obsoleteSha = 'b'.repeat(40);
    await expect(pullGitHubDevBuild(host, {
      ...preview, remoteVersion: '1.0.0', commitSha: obsoleteSha,
    })).resolves.toMatchObject({ commitSha: sha, remoteVersion: '1.18.2' });
    const rawUrls = requestUrlMock.mock.calls
      .map(([arg]: any[]) => String(arg.url))
      .filter((url) => url.includes('raw.githubusercontent'));
    expect(rawUrls).toHaveLength(3);
    expect(rawUrls.every((url) => url.includes(`/${sha}/`))).toBe(true);
    expect(rawUrls.every((url) => !url.includes(`/${obsoleteSha}/`))).toBe(true);
  });

  it('shows only commit time when the matching push event has expired', async () => {
    mockGitHub({ events: [] });
    await expect(getGitHubDevBuildInfo('think-os')).resolves.toMatchObject({
      githubPushedAt: null, githubCommitAt: committedAt, commitSha: sha,
    });
  });

  it('stops safely if the immutable SHA cannot be resolved (no moving main fallback)', async () => {
    mockGitHub({ failHead: true });
    const { host, write } = makeHost();
    await expect(pullGitHubDevBuild(host)).rejects.toThrow('获取 GitHub main 最新提交失败');
    expect(write).not.toHaveBeenCalled();
  });

  it('rejects invalid manifests and partial downloads before modifying disk', async () => {
    mockGitHub();
    const { host, write } = makeHost();
    const wrongPluginHost = { ...host, manifest: { id: 'not-think-os' } };
    await expect(pullGitHubDevBuild(wrongPluginHost))
      .rejects.toThrow('远端插件 ID 不匹配');
    expect(write).not.toHaveBeenCalled();
    mockGitHub({ failCss: true });
    await expect(pullGitHubDevBuild(host, preview)).rejects.toThrow('下载 styles.css');
    expect(write).not.toHaveBeenCalled();
  });

  it('restores even the partially-written file if the write rejects mid-stream', async () => {
    mockGitHub();
    const { host, write, files } = makeHost();
    let failed = false;
    write.mockImplementation(async (path: string, data: string) => {
      files[path] = data; // storage wrote bytes BEFORE reporting the failure
      if (!failed && path.endsWith('/styles.css')) { failed = true; throw new Error('disk full'); }
    });
    await expect(pullGitHubDevBuild(host, preview)).rejects.toThrow('已回滚到原版本');
    expect(files['.obsidian/plugins/think-os/main.js']).toBe('old-main');
    expect(files['.obsidian/plugins/think-os/styles.css']).toBe('old-css');
    expect(files['.obsidian/plugins/think-os/manifest.json']).toContain('1.0.0');
  });

  it('detects silent readback corruption and rolls back', async () => {
    mockGitHub();
    const { host, files, write } = makeHost();
    let corrupt = true;
    write.mockImplementation(async (path: string, text: string) => {
      files[path] = corrupt && path.endsWith('main.js') ? 'corrupt bytes' : text;
      corrupt = false;
    });
    await expect(pullGitHubDevBuild(host, preview)).rejects.toThrow('main.js 写入校验失败');
    expect(files['.obsidian/plugins/think-os/main.js']).toBe('old-main');
  });
});
