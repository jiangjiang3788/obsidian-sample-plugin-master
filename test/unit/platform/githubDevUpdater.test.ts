/** @covers GitHubDevUpdater/unit */
import { requestUrl } from 'obsidian';
import {
  getGitHubDevBuildInfo, pullGitHubDevBuild, findGitHubRevisionPushTime,
} from '@/platform/obsidian/GitHubDevUpdater';

const requestUrlMock = requestUrl as jest.MockedFunction<typeof requestUrl>;
const sha = 'a'.repeat(40);
const previousSha = 'b'.repeat(40);
const committedAt = '2026-10-14T03:12:00.000Z';
const pushedAt = '2026-10-14T03:17:00.000Z';
const contents = {
  'main.js': `/* build */\n${'x'.repeat(1200)}`,
  'styles.css': `.think-os { display: block; }\n${' '.repeat(120)}`,
  'manifest.json': JSON.stringify({ id: 'think-os', version: '1.18.2', main: 'main.js', styles: 'styles.css' }),
};
const inspected = {
  remoteVersion: '1.18.2', branch: 'main', githubPushedAt: null,
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

function mockGitHub(input: {
  headStatus?: number; failCss?: number; eventsStatus?: number; events?: unknown;
  headSha?: string; rateLimit?: boolean;
} = {}) {
  requestUrlMock.mockImplementation(async (options: any) => {
    const url = String(options?.url || '');
    const headSha = input.headSha ?? sha;
    if (url.includes('/commits/main')) {
      return {
        status: input.headStatus ?? 200,
        headers: input.rateLimit ? { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': '1791980000' } : {},
        text: JSON.stringify({ sha: headSha, commit: { committer: { date: committedAt } }, message: 'API rate limit exceeded' }),
      } as any;
    }
    if (url.includes('/events?')) {
      return { status: input.eventsStatus ?? 200, headers: {},
        text: JSON.stringify(input.events ?? [{
          type: 'PushEvent', created_at: pushedAt, payload: { ref: 'refs/heads/main', head: headSha },
        }]),
      } as any;
    }
    for (const [file, content] of Object.entries(contents)) {
      if (url.includes(`/${headSha}/${file}`) || url.includes(`/${previousSha}/${file}`)) {
        const status = file === 'styles.css' ? input.failCss ?? 200 : 200;
        return { status, headers: {}, text: status === 200 ? content : JSON.stringify({ message: 'Forbidden' }) } as any;
      }
    }
    return { status: 404, headers: {}, text: 'Not found' } as any;
  });
}

function rawCalls() {
  return requestUrlMock.mock.calls
    .map(([arg]: any[]) => String(arg.url))
    .filter((url) => url.includes('raw.githubusercontent.com'));
}

describe('GitHubDevUpdater - limited API budget, pinned download and diagnostics', () => {
  beforeEach(() => requestUrlMock.mockReset());

  it('only matches a push event with an exact branch and SHA', () => {
    expect(findGitHubRevisionPushTime([
      { type: 'PushEvent', created_at: pushedAt, payload: { ref: 'refs/heads/main', head: previousSha } },
      { type: 'PushEvent', created_at: pushedAt, payload: { ref: 'refs/heads/test', head: sha } },
    ], sha)).toBeNull();
    expect(findGitHubRevisionPushTime([
      { type: 'PushEvent', created_at: pushedAt, payload: { ref: 'refs/heads/main', head: sha } },
    ], sha)).toBe(pushedAt);
  });

  it('inspects main + manifest only; does not waste API requests on events during preview', async () => {
    mockGitHub();
    await expect(getGitHubDevBuildInfo('think-os')).resolves.toEqual(inspected);
    expect(requestUrlMock.mock.calls).toHaveLength(2);
    expect(requestUrlMock.mock.calls.some(([arg]: any[]) => String(arg.url).includes('/events?'))).toBe(false);
  });

  it('refreshes main on ordinary click, pins the same SHA for three raw files and shows push time', async () => {
    mockGitHub();
    const { host, write, files } = makeHost();
    await expect(pullGitHubDevBuild(host)).resolves.toEqual({ ...inspected, githubPushedAt: pushedAt });
    expect(rawCalls()).toHaveLength(3);
    expect(rawCalls().every((url) => url.includes(`/${sha}/`) && !url.includes('?t='))).toBe(true);
    expect(write.mock.calls.map(([path]) => path.split('/').pop())).toEqual(['main.js', 'styles.css', 'manifest.json']);
    for (const file of ['main.js', 'styles.css', 'manifest.json'] as const) {
      expect(files[`.obsidian/plugins/think-os/${file}`]).toBe(contents[file]);
    }
    expect(requestUrlMock.mock.calls.filter(([arg]: any[]) => String(arg.url).includes('/events?'))).toHaveLength(1);
  });

  it('rejects overlapping settings/command updates without extra requests or interleaved writes', async () => {
    mockGitHub();
    const request = requestUrlMock.getMockImplementation()!;
    let releaseHead!: () => void;
    const headGate = new Promise<void>((resolve) => { releaseHead = resolve; });
    requestUrlMock.mockImplementation(async (options) => {
      if (String(options?.url).includes('/commits/main')) await headGate;
      return request(options);
    });
    const { host, write } = makeHost();
    const first = pullGitHubDevBuild(host);
    await expect(pullGitHubDevBuild(host)).rejects.toThrow('正在下载或安装');
    expect(requestUrlMock.mock.calls.filter(([options]) => String(options.url).includes('/commits/main')))
      .toHaveLength(1);
    expect(write).not.toHaveBeenCalled();
    releaseHead();
    await expect(first).resolves.toMatchObject({ commitSha: sha });
    expect(write).toHaveBeenCalledTimes(3);

    // The guard is removed on completion, so a later update can still run.
    await expect(pullGitHubDevBuild(host)).resolves.toMatchObject({ commitSha: sha });
    expect(write).toHaveBeenCalledTimes(6);
  });

  it('reports GitHub API 403 with endpoint + reset time, without writing local files', async () => {
    mockGitHub({ headStatus: 403, rateLimit: true });
    const { host, write } = makeHost();
    await expect(pullGitHubDevBuild(host)).rejects.toThrow(/api.github.com.*HTTP 403.*配额已用完/);
    expect(write).not.toHaveBeenCalled();
    expect(requestUrlMock.mock.calls.every(([options]: any[]) => options.throw === false)).toBe(true);
  });

  it('allows explicitly chosen inspected SHA when main is 403, without falsely claiming latest', async () => {
    mockGitHub({ headStatus: 403 });
    const { host, write, files } = makeHost();
    await expect(pullGitHubDevBuild(host, inspected)).resolves.toMatchObject({ commitSha: sha });
    expect(requestUrlMock.mock.calls.some(([arg]: any[]) => String(arg.url).includes('/commits/main'))).toBe(false);
    expect(rawCalls()).toHaveLength(3);
    expect(write).toHaveBeenCalledTimes(3);
    expect(files['.obsidian/plugins/think-os/main.js']).toBe(contents['main.js']);
  });

  it('diagnoses a raw asset 403 separately from API rate limit; does not write any file', async () => {
    mockGitHub({ failCss: 403 });
    const { host, write } = makeHost();
    await expect(pullGitHubDevBuild(host)).rejects.toThrow(/下载 styles.css.*raw.githubusercontent.com.*HTTP 403/);
    expect(write).not.toHaveBeenCalled();
    expect(requestUrlMock.mock.calls.filter(([arg]: any[]) => String(arg.url).includes('/events?'))).toHaveLength(0);
  });

  it('treats a PushEvent 403 as optional and still finishes installation', async () => {
    mockGitHub({ eventsStatus: 403 });
    const { host, write } = makeHost();
    await expect(pullGitHubDevBuild(host)).resolves.toMatchObject({ githubPushedAt: null });
    expect(write).toHaveBeenCalledTimes(3);
  });

  it('rejects wrong plugin ID and partial downloads before touching disk', async () => {
    mockGitHub();
    const { host, write } = makeHost();
    await expect(pullGitHubDevBuild({ ...host, manifest: { id: 'not-think-os' } }))
      .rejects.toThrow('远端插件 ID 不匹配');
    expect(write).not.toHaveBeenCalled();
    mockGitHub({ failCss: 503 });
    await expect(pullGitHubDevBuild(host)).rejects.toThrow('下载 styles.css');
    expect(write).not.toHaveBeenCalled();
  });

  it('rolls back after partially written files and silent readback corruption', async () => {
    mockGitHub();
    const { host, write, files } = makeHost();
    let failed = false;
    write.mockImplementation(async (path: string, data: string) => {
      files[path] = data;
      if (!failed && path.endsWith('/styles.css')) { failed = true; throw new Error('disk full'); }
    });
    await expect(pullGitHubDevBuild(host)).rejects.toThrow('已回滚到原版本');
    expect(files['.obsidian/plugins/think-os/main.js']).toBe('old-main');
    expect(files['.obsidian/plugins/think-os/styles.css']).toBe('old-css');
    write.mockReset();
    let corrupt = true;
    write.mockImplementation(async (path: string, text: string) => {
      files[path] = corrupt && path.endsWith('main.js') ? 'corrupt bytes' : text;
      corrupt = false;
    });
    await expect(pullGitHubDevBuild(host)).rejects.toThrow('main.js 写入校验失败');
    expect(files['.obsidian/plugins/think-os/main.js']).toBe('old-main');
  });
});
