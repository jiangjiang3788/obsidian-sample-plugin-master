import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const docsRoot = path.join(repoRoot, '文档');
const resourceRoot = path.join(docsRoot, '_资源');

const IGNORED_DIRS_FOR_SEARCH = new Set(['_归档', '_模板', '_资源', '_数据']);

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

function stripOrderPrefix(value) {
  return String(value || '').replace(/^\d+[-_]/, '').replace(/-/g, ' ').trim();
}

function stripHtmlTitle(value) {
  return String(value || '').split('｜')[0].trim();
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function unique(values) {
  const seen = new Set();
  const output = [];
  values.forEach(value => {
    const text = normalizeText(value);
    if (!text || seen.has(text)) return;
    seen.add(text);
    output.push(text);
  });
  return output;
}

function getSortKey(item) {
  if (item.url === 'index.html') return '00-基础入口/00-项目驾驶舱/00-index.html';
  return item.url;
}

async function walkHtmlFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '_资源' || entry.name === '_数据') continue;
      files.push(...await walkHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }

  return files;
}

function shouldIncludeInSearch(relativeUrl) {
  const firstSegment = relativeUrl.split('/')[0];
  return !IGNORED_DIRS_FOR_SEARCH.has(firstSegment);
}

function extractPage(filePath, relativeUrl, html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const main = document.querySelector('.main');
  const title = stripHtmlTitle(document.title)
    || normalizeText(document.querySelector('h1')?.textContent)
    || path.basename(relativeUrl, '.html');
  const summary = normalizeText(
    document.querySelector('.lead')?.textContent
    || document.querySelector('meta[name="description"]')?.getAttribute('content')
    || main?.querySelector('p')?.textContent
    || ''
  ).slice(0, 220);
  const pathTags = relativeUrl === 'index.html'
    ? ['index']
    : relativeUrl.split('/').slice(0, -1).flatMap(segment => [segment, stripOrderPrefix(segment)]);
  const headingTags = Array.from(document.querySelectorAll('h1, h2'))
    .slice(0, 10)
    .map(node => node.textContent);
  const tags = unique(['Think OS', 'Obsidian', ...pathTags, title, ...headingTags]);

  return {
    url: relativeUrl,
    searchItem: { title, url: relativeUrl, tags, summary },
    cacheItem: {
      title,
      mainClass: main?.className || 'main',
      mainHtml: main?.innerHTML || ''
    }
  };
}

async function main() {
  const htmlFiles = await walkHtmlFiles(docsRoot);
  const pages = [];

  for (const filePath of htmlFiles) {
    const relativeUrl = toPosixPath(path.relative(docsRoot, filePath));
    const html = await fs.readFile(filePath, 'utf8');
    pages.push(extractPage(filePath, relativeUrl, html));
  }

  pages.sort((a, b) => getSortKey(a).localeCompare(getSortKey(b), 'zh-CN', { numeric: true }));

  const searchIndex = pages
    .filter(page => shouldIncludeInSearch(page.url))
    .map(page => page.searchItem);
  const pageCache = {
    generatedAt: new Date().toISOString(),
    pages: Object.fromEntries(pages.map(page => [page.url, page.cacheItem]))
  };

  await fs.mkdir(resourceRoot, { recursive: true });
  await fs.writeFile(
    path.join(resourceRoot, '搜索索引.js'),
    `window.DOC_SEARCH_INDEX = ${JSON.stringify(searchIndex, null, 2)};\n`,
    'utf8'
  );
  await fs.writeFile(
    path.join(resourceRoot, '页面内容索引.js'),
    `/* 文件环境 PJAX 页面内容索引：用于 file:// 下避免 fetch 失败导致整页刷新。自动生成，请勿手改。 */\nwindow.THINK_DOC_PAGE_CACHE = ${JSON.stringify(pageCache)};\n`,
    'utf8'
  );

  console.log(`Generated ${searchIndex.length} search entries and ${pages.length} page cache entries.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
