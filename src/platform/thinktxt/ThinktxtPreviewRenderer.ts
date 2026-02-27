// src/platform/thinktxt/ThinktxtPreviewRenderer.ts
import type { MarkdownPostProcessorContext, Plugin } from "obsidian";

type ThinktxtKV = Record<string, string>;

const THINKTXT_DEBUG = true;

function dlog(...args: any[]) {
  if (!THINKTXT_DEBUG) return;
  // eslint-disable-next-line no-console
  console.log("[thinktxt]", ...args);
}

function stripQuotePrefix(line: string): string {
  // supports ">" and ">-" (with/without space)
  return line.replace(/^\s*>\s?/, "");
}

function isThinktxtCalloutHeader(line: string): boolean {
  const s = stripQuotePrefix(line).trim();
  return /^\[!thinktxt\]\s*$/i.test(s);
}

function parseKVLines(lines: string[]): ThinktxtKV {
  const kv: ThinktxtKV = {};
  for (const raw of lines) {
    const line = stripQuotePrefix(raw).trim();
    if (!line) continue;
    if (/^\[!thinktxt\]\s*$/i.test(line)) continue;

    const m = line.match(/^([^:：]+)::\s*(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2].trim();
    if (!key) continue;
    kv[key] = val;
  }
  return kv;
}

function isIgnorableBetweenBlocks(text: string): boolean {
  // Allow only blank/whitespace and HTML comments between records
  const s = text.trim();
  if (!s) return true;
  const onlyComments = s.replace(/<!--[\s\S]*?-->/g, "").trim();
  return onlyComments.length === 0;
}

/**
 * Compute group sizes by scanning <!-- start --> ... <!-- end --> blocks in source markdown.
 * Groups are merged if between blocks is ignorable (blank/comments only).
 */
function computeGroupSizesFromSource(markdown: string): { sizes: number[]; debug: any } {
  const re = /<!--\s*start\s*-->([\s\S]*?)<!--\s*end\s*-->/gi;

  const positions: { start: number; end: number; hasThinktxt: boolean }[] = [];
  let m: RegExpExecArray | null;

  while ((m = re.exec(markdown))) {
    const start = m.index;
    const end = re.lastIndex;
    const body = m[1] ?? "";
    const hasThinktxt = body.split(/\r?\n/).some((l) => isThinktxtCalloutHeader(l));
    positions.push({ start, end, hasThinktxt });
  }

  const thinktxtPositions = positions.filter((p) => p.hasThinktxt);
  if (thinktxtPositions.length === 0) {
    return { sizes: [], debug: { totalStartEnd: positions.length, thinktxtStartEnd: 0 } };
  }

  const debugBetween: Array<{ i: number; ignorable: boolean; betweenPreview: string }> = [];
  const sizes: number[] = [];

  let currentSize = 1;
  for (let i = 1; i < thinktxtPositions.length; i++) {
    const prev = thinktxtPositions[i - 1];
    const curr = thinktxtPositions[i];
    const between = markdown.slice(prev.end, curr.start);

    const ignorable = isIgnorableBetweenBlocks(between);
    const betweenPreview =
      between.length > 200 ? between.slice(0, 200) + `...(len=${between.length})` : between;

    debugBetween.push({ i, ignorable, betweenPreview });

    if (ignorable) currentSize += 1;
    else {
      sizes.push(currentSize);
      currentSize = 1;
    }
  }
  sizes.push(currentSize);

  return {
    sizes,
    debug: {
      totalStartEnd: positions.length,
      thinktxtStartEnd: thinktxtPositions.length,
      debugBetween,
    },
  };
}

function buildKVTable(records: ThinktxtKV[]): HTMLTableElement {
  const table = document.createElement("table");
  table.className = "thinktxt-table";

  const preferred = ["分类", "日期", "主题", "评分", "内容"];

  const colSet = new Set<string>();
  for (const r of records) Object.keys(r).forEach((k) => colSet.add(k));

  const cols = [
    ...preferred.filter((k) => colSet.has(k)),
    ...Array.from(colSet)
      .filter((k) => !preferred.includes(k))
      .sort((a, b) => a.localeCompare(b)),
  ];

  const thead = table.createTHead();
  const hrow = thead.insertRow();
  for (const c of cols) {
    const th = document.createElement("th");
    th.textContent = c;
    hrow.appendChild(th);
  }

  const tbody = table.createTBody();
  for (const r of records) {
    const row = tbody.insertRow();
    for (const c of cols) {
      const td = row.insertCell();
      td.textContent = r[c] ?? "";
    }
  }

  return table;
}

function parseCalloutKV(callout: HTMLElement): ThinktxtKV {
  const text = callout.innerText ?? "";
  const lines = text.split(/\r?\n/);
  return parseKVLines(lines);
}

function replaceGroupWithTable(callouts: HTMLElement[], records: ThinktxtKV[]): void {
  if (callouts.length === 0) return;

  const container = document.createElement("div");
  container.className = "thinktxt-table-container";

  const table = buildKVTable(records);
  container.appendChild(table);

  const first = callouts[0];
  first.parentElement?.insertBefore(container, first);

  for (const c of callouts) c.remove();
}

/**
 * Find a stable root container for the current reading pane.
 * Prefer nearest ".markdown-reading-view" or ".markdown-preview-view".
 */
function findPreviewRoot(el: HTMLElement): HTMLElement {
  return (
    el.closest<HTMLElement>(".markdown-reading-view") ??
    el.closest<HTMLElement>(".markdown-preview-view") ??
    el.closest<HTMLElement>(".markdown-rendered") ??
    el
  );
}

function collectThinktxtCallouts(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-callout="thinktxt"]'));
}

// Dedup scheduler per (root, sourcePath)
const scheduled = new WeakMap<HTMLElement, Map<string, number>>();

async function runGlobalMerge(plugin: Plugin, root: HTMLElement, sourcePath: string) {
  // read source
  let markdown = "";
  try {
    const file = plugin.app.vault.getAbstractFileByPath(sourcePath) as any;
    markdown = await plugin.app.vault.read(file);
  } catch (e) {
    dlog("❌ 读取源文件失败：", sourcePath, e);
    return;
  }

  const { sizes, debug } = computeGroupSizesFromSource(markdown);
  dlog("📄 当前文件：", sourcePath);
  dlog("🔎 start/end 总数=", debug.totalStartEnd, "其中包含 thinktxt 的块数=", debug.thinktxtStartEnd);
  dlog("🧩 源文本分组 sizes=", sizes);
  if (debug.debugBetween?.length) {
    for (const b of debug.debugBetween) {
      dlog(`— between #${b.i} 是否可忽略=${b.ignorable}，片段=`, b.betweenPreview);
    }
  }

  if (sizes.length === 0) return;

  // wait for callouts to appear (render can be async / split into sections)
  let callouts: HTMLElement[] = [];
  const maxRetry = 20;
  for (let i = 0; i <= maxRetry; i++) {
    callouts = collectThinktxtCallouts(root);
    if (callouts.length > 0) break;
    await new Promise((r) => window.setTimeout(r, 80));
  }

  dlog("🧱 预览 DOM 找到 thinktxt callout 数量=", callouts.length);
  if (callouts.length === 0) {
    dlog("⚠️ 找不到 callout。root=", root.className, "rootTag=", root.tagName);
    return;
  }

  // Merge by group sizes
  let idx = 0;
  for (let gi = 0; gi < sizes.length; gi++) {
    const size = sizes[gi];
    const group = callouts.slice(idx, idx + size);

    dlog(`➡️ 处理组 #${gi + 1}：期望 size=${size}，DOM 实际拿到=${group.length}，idx=${idx}`);

    // Not enough DOM nodes => stop (DOM not matching source)
    if (group.length < size) {
      dlog("⚠️ DOM 的 callout 数量不足以匹配源文本分组，停止合并。");
      break;
    }

    // If size==1, no merge needed
    if (size <= 1) {
      idx += size;
      continue;
    }

    const records = group.map(parseCalloutKV);
    dlog(`✅ 合并组 #${gi + 1}：将 ${group.length} 条记录合成 1 个表格`);
    replaceGroupWithTable(group, records);

    idx += size;
    if (idx >= callouts.length) break;
  }
}

function schedule(plugin: Plugin, root: HTMLElement, sourcePath: string) {
  const m = scheduled.get(root) ?? new Map<string, number>();
  scheduled.set(root, m);

  const prev = m.get(sourcePath);
  if (prev != null) window.clearTimeout(prev);

  const tid = window.setTimeout(() => {
    // no await here; fire and forget, but internally it awaits safely
    void runGlobalMerge(plugin, root, sourcePath);
  }, 50);

  m.set(sourcePath, tid);
}

export function registerThinktxtPreview(plugin: Plugin): void {
  plugin.registerMarkdownPostProcessor((el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
    const path = ctx.sourcePath;
    if (!path) return;

    const root = findPreviewRoot(el);

    const sec = ctx.getSectionInfo?.(el as any);
    if (THINKTXT_DEBUG) {
      const localCount = el.querySelectorAll?.('[data-callout="thinktxt"]').length ?? 0;
      dlog(
        "🧩 postProcessor 触发：",
        "sourcePath=",
        path,
        "el.callouts=",
        localCount,
        "section=",
        sec ? `lineStart=${sec.lineStart}, lineEnd=${sec.lineEnd}` : "无 sectionInfo",
        "root=",
        root.className || root.tagName
      );
    }

    schedule(plugin, root, path);
  });
}
