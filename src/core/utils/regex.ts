// utils/regex.ts
export const DATE_YMD = '\\d{4}[-/]\\d{2}[-/]\\d{2}';
export const DATE_YMD_RE = new RegExp(DATE_YMD);

export const TAG_RE = /#([\p{L}\p{N}_\/-]+)/gu;
export const KV_IN_PAREN = /\(([^:：]+)::\s*([^)]+)\)/g;
export const META_BRACKET = /\([^:：]+::\s*[^)]+\)/g;

export const RE_TASK_PREFIX = /^\s*-\s*\[[ xX-]\]/;
export const RE_DONE_BOX    = /^\s*-\s*\[x\]/i;
export const RE_CANCEL_BOX  = /^\s*-\s*\[-\]/;
export const RE_EMPTY_BOX   = /^\s*-\s*\[ \]/;